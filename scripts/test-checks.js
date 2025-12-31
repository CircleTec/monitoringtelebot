import { checkServiceHttp, checkServiceTcp } from '../src/engine/index.js';

// Test each service with dual checks
const testServices = [
    { name: 'Google', target: 'google.com', timeout: 5000 },
    { name: 'Courses YenettaCode', target: 'courses.yenettacode.com', timeout: 5000 },
];

console.log('Testing services with Dual Checks (HTTP + TCP)...\n');

for (const service of testServices) {
    console.log(`Testing ${service.name}...`);

    console.log(`  Performing HTTP Check...`);
    const httpRes = await checkServiceHttp(service);
    console.log(`    Status: ${httpRes.status} (${httpRes.responseTime}ms) ${httpRes.errorMessage ? '| Error: ' + httpRes.errorMessage : ''}`);

    console.log(`  Performing TCP Check...`);
    const tcpRes = await checkServiceTcp(service);
    console.log(`    Status: ${tcpRes.status} (${tcpRes.responseTime}ms) ${tcpRes.errorMessage ? '| Error: ' + tcpRes.errorMessage : ''}`);

    console.log('');
}

process.exit(0);
