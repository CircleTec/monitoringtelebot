import { defineConfig } from 'drizzle-kit';

/** @type { import("drizzle-kit").Config } */
export default defineConfig({
    schema: './src/db/schema.js',
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        url: 'database.sqlite',
    },
});
