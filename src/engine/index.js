import axios from 'axios';
import net from 'net';
import { db } from '../db/index.js';
import { services, serviceLogs } from '../db/schema.js';
import { eq, lt } from 'drizzle-orm';
import { sendAlert } from '../bot/index.js';

// HTTP check only
async function checkServiceHttp(service) {
  const start = Date.now();
  let status = 'down';
  let responseTime = 0;
  let errorMessage = null;

  try {
    // Add protocol if missing
    let url = service.target;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const res = await axios.get(url, {
      timeout: service.timeout,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonitoringBot/1.0; +https://github.com/monitoring)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    responseTime = Date.now() - start;
    if (res.status >= 200 && res.status < 400) {
      status = 'up';
    } else {
      errorMessage = `HTTP ${res.status}`;
    }
  } catch (err) {
    status = 'down';
    errorMessage = err.message;
    responseTime = Date.now() - start;
  }

  return { status, responseTime, errorMessage };
}

// TCP check only
async function checkServiceTcp(service) {
  const start = Date.now();
  let status = 'down';
  let responseTime = 0;
  let errorMessage = null;

  try {
    await new Promise((resolve, reject) => {
      const targetParts = service.target.split(':');
      const host = targetParts[0];
      // Default to port 443 if not specified
      const port = targetParts[1] ? parseInt(targetParts[1]) : 443;

      const socket = new net.Socket();
      socket.setTimeout(service.timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Timeout'));
      });
      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });
      socket.connect(port, host);
    });
    status = 'up';
    responseTime = Date.now() - start;
  } catch (err) {
    status = 'down';
    errorMessage = err.message;
    responseTime = Date.now() - start;
  }

  return { status, responseTime, errorMessage };
}

export async function processServiceCheck(serviceInput) {
  // CRITICAL: Fetch fresh service data to avoid stale state from closures
  const [service] = await db.select().from(services).where(eq(services.id, serviceInput.id));

  // Guard clause: service might have been deleted
  if (!service || !service.enabled) {
    return;
  }

  // Perform BOTH checks
  const httpResult = await checkServiceHttp(service);
  const tcpResult = await checkServiceTcp(service);

  // Log both checks
  await db.insert(serviceLogs).values({
    serviceId: service.id,
    checkType: 'http',
    status: httpResult.status,
    responseTime: httpResult.responseTime,
    errorMessage: httpResult.errorMessage,
  });

  await db.insert(serviceLogs).values({
    serviceId: service.id,
    checkType: 'tcp',
    status: tcpResult.status,
    responseTime: tcpResult.responseTime,
    errorMessage: tcpResult.errorMessage,
  });

  const lastOverallStatus = service.lastStatus;

  // Calculate new failure counts
  let newHttpFailureCount = service.httpFailureCount;
  if (httpResult.status === 'down') {
    newHttpFailureCount++;
  } else {
    newHttpFailureCount = 0;
  }

  let newTcpFailureCount = service.tcpFailureCount;
  if (tcpResult.status === 'down') {
    newTcpFailureCount++;
  } else {
    newTcpFailureCount = 0;
  }

  // Determine overall status (DOWN if EITHER check has failed 2+ times)
  const THRESHOLD = 2;
  let overallStatus = 'up';

  if (newHttpFailureCount >= THRESHOLD || newTcpFailureCount >= THRESHOLD) {
    overallStatus = 'down';
  }

  // State Transition Detection for Alerts
  // Log logic state for debugging
  console.log(`[Check: ${service.name}] Status: ${overallStatus} (Last: ${lastOverallStatus}) | HTTP failures: ${newHttpFailureCount} | TCP failures: ${newTcpFailureCount}`);

  if (overallStatus !== lastOverallStatus) {
    console.log(`[Status Change] ${service.name} went from ${lastOverallStatus.toUpperCase()} to ${overallStatus.toUpperCase()}`);

    if (overallStatus === 'down' && lastOverallStatus !== 'down') {
      const msg = `❌ *Service DOWN*\n` +
        `Name: ${service.name}\n` +
        `Target: ${service.target}\n` +
        `HTTP: ${newHttpFailureCount >= THRESHOLD ? httpResult.errorMessage || 'Failed' : 'OK'} (${newHttpFailureCount} failures)\n` +
        `TCP: ${newTcpFailureCount >= THRESHOLD ? tcpResult.errorMessage || 'Failed' : 'OK'} (${newTcpFailureCount} failures)`;

      console.log('Sending DOWN alert...');
      sendAlert(msg);

    } else if (overallStatus === 'up' && lastOverallStatus === 'down') {
      const msg = `✅ *Service RECOVERED*\n` +
        `Name: ${service.name}\n` +
        `Target: ${service.target}\n` +
        `HTTP: ${httpResult.status} (${httpResult.responseTime}ms)\n` +
        `TCP: ${tcpResult.status} (${tcpResult.responseTime}ms)`;

      console.log('Sending RECOVERY alert...');
      sendAlert(msg);
    }
  }

  // Update service state
  await db.update(services)
    .set({
      lastHttpStatus: httpResult.status,
      lastTcpStatus: tcpResult.status,
      lastStatus: overallStatus,
      httpFailureCount: newHttpFailureCount,
      tcpFailureCount: newTcpFailureCount,
      lastCheckedAt: new Date(),
    })
    .where(eq(services.id, service.id));
}

async function cleanupOldLogs() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.delete(serviceLogs)
      .where(lt(serviceLogs.checkedAt, thirtyDaysAgo));

    console.log(`[Maintenance] Log cleanup complete. Pruned logs older than 30 days.`);
  } catch (err) {
    console.error('[Maintenance] Error during log cleanup:', err);
  }
}

export function startMonitoring() {
  // Track interval IDs for each service
  const intervalTrackers = new Map();

  // Function to schedule a single service
  function scheduleService(service) {
    // Clear existing interval if any
    if (intervalTrackers.has(service.id)) {
      clearInterval(intervalTrackers.get(service.id));
    }

    if (!service.enabled) {
      return;
    }

    // Run immediately
    processServiceCheck(service).catch(err => console.error(`Error checking ${service.name}:`, err));

    // Then schedule recurring checks based on service interval
    const intervalMs = (service.interval || 60) * 1000;
    const intervalId = setInterval(() => {
      processServiceCheck(service).catch(err => console.error(`Error checking ${service.name}:`, err));
    }, intervalMs);

    intervalTrackers.set(service.id, intervalId);
    console.log(`Scheduled ${service.name} to check every ${service.interval || 60}s (dual HTTP+TCP)`);
  }

  // Initial load and schedule all services
  async function loadAndScheduleServices() {
    try {
      const allServices = await db.select().from(services);

      // Clear old intervals for deleted services
      const currentServiceIds = new Set(allServices.map(s => s.id));
      for (const [id, intervalId] of intervalTrackers.entries()) {
        if (!currentServiceIds.has(id)) {
          clearInterval(intervalId);
          intervalTrackers.delete(id);
        }
      }

      // Schedule all services
      for (const service of allServices) {
        scheduleService(service);
      }
    } catch (err) {
      console.error('Error loading services:', err);
    }
  }

  // Load services initially
  loadAndScheduleServices();

  // Run initial cleanup and schedule daily cleanup (every 24 hours)
  cleanupOldLogs();
  setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

  // Re-sync every minute to pick up any changes to intervals/services
  setInterval(loadAndScheduleServices, 60000);

  console.log('Monitoring engine started with dual HTTP+TCP checks.');
}
