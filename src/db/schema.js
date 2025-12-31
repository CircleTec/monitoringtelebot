import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const services = sqliteTable('services', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  target: text('target').notNull(),
  method: text('method').$default(() => 'GET'),
  interval: integer('interval').notNull().$default(() => 1800),
  timeout: integer('timeout').notNull().$default(() => 5000),
  // Dual-check failure counters
  httpFailureCount: integer('http_failure_count').notNull().$default(() => 0),
  tcpFailureCount: integer('tcp_failure_count').notNull().$default(() => 0),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().$default(() => true),
  // Separate status for each check type
  lastHttpStatus: text('last_http_status').$default(() => 'unknown'), // 'up', 'down', 'unknown'
  lastTcpStatus: text('last_tcp_status').$default(() => 'unknown'), // 'up', 'down', 'unknown'
  lastStatus: text('last_status').$default(() => 'unknown'), // overall status
  lastCheckedAt: integer('last_checked_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const serviceLogs = sqliteTable('service_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  serviceId: integer('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  checkType: text('check_type').notNull(), // 'http' or 'tcp'
  status: text('status').notNull(),
  responseTime: real('response_time'),
  errorMessage: text('error_message'),
  checkedAt: integer('checked_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
