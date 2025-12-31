import { defineConfig } from 'drizzle-kit';

/** @type { import("drizzle-kit").Config } */
export default defineConfig({
    schema: './src/db/schema.js',
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        // This MUST be the absolute path to the persistent volume
        url: '/app/data/database.sqlite',
    },
});
