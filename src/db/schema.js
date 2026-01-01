import { pgTable, text, integer, serial, boolean, timestamp, real } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  target: text('target').notNull(),
  method: text('method').default('GET'),
  interval: integer('interval').notNull().default(1800),
  timeout: integer('timeout').notNull().default(5000),
  // Dual-check failure counters
  httpFailureCount: integer('http_failure_count').notNull().default(0),
  tcpFailureCount: integer('tcp_failure_count').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  // Separate status for each check type
  lastHttpStatus: text('last_http_status').default('unknown'), // 'up', 'down', 'unknown'
  lastTcpStatus: text('last_tcp_status').default('unknown'), // 'up', 'down', 'unknown'
  lastStatus: text('last_status').default('unknown'), // overall status
  lastCheckedAt: timestamp('last_checked_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const serviceLogs = pgTable('service_logs', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  checkType: text('check_type').notNull(), // 'http' or 'tcp'
  status: text('status').notNull(),
  responseTime: real('response_time'),
  errorMessage: text('error_message'),
  checkedAt: timestamp('checked_at').defaultNow(),
});
