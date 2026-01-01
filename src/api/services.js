import express from 'express';
import { db } from '../db/index.js';
import { services, serviceLogs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../utils/auth.js';
import { sendAlert } from '../bot/index.js';
import { processServiceCheck } from '../engine/index.js';

const router = express.Router();

router.use(authMiddleware);

// Get all services
router.get('/', async (req, res) => {
    try {
        const result = await db.select().from(services);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add service
router.post('/', async (req, res) => {
    const { name, target, interval, timeout, enabled } = req.body;
    try {
        const result = await db.insert(services).values({
            name,
            target,
            interval: interval || 1800,
            timeout: timeout || 5000,
            enabled: enabled !== undefined ? enabled : true,
        }).returning();
        res.status(201).json(result[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update service
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const result = await db.update(services)
            .set(updates)
            .where(eq(services.id, parseInt(id)))
            .returning();
        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete service
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const serviceId = parseInt(id);
    console.log(`[API] Received DELETE request for service ID: ${serviceId}`);
    try {
        // Explicitly delete logs first as a safety measure
        await db.delete(serviceLogs).where(eq(serviceLogs.serviceId, serviceId));
        console.log(`[API] Deleted logs for service ID: ${serviceId}`);

        const result = await db.delete(services).where(eq(services.id, serviceId));
        console.log(`[API] Successfully deleted service ID: ${serviceId}`);
        res.json({ message: 'Service deleted' });
    } catch (err) {
        console.error(`[API] Error deleting service ID: ${serviceId}:`, err);
        res.status(500).json({ error: err.message });
    }
});

// Manual Check - Trigger immediate dual check for a service
router.post('/:id/check', async (req, res) => {
    const { id } = req.params;
    const serviceId = parseInt(id);

    try {
        // Fetch the service to verify it exists
        const [service] = await db.select().from(services).where(eq(services.id, serviceId));

        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        // Trigger the dual check
        console.log(`[API] Manual check triggered for service: ${service.name} (ID: ${serviceId})`);
        await processServiceCheck(service);

        // Fetch updated service data to return
        const [updatedService] = await db.select().from(services).where(eq(services.id, serviceId));

        res.json({
            message: 'Check completed',
            service: updatedService
        });
    } catch (err) {
        console.error(`[API] Error during manual check for service ID ${serviceId}:`, err);
        res.status(500).json({ error: err.message });
    }
});

// Test Alert
router.post('/test-alert', async (req, res) => {
    try {
        sendAlert('🔔 *Test Alert*\n\nIf you receive this, your Telegram bot is configured correctly!');
        res.json({ message: 'Test alert sent' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
