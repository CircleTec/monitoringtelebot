import { db } from '../src/db/index.js';
import { services } from '../src/db/schema.js';

const allServices = await db.select().from(services);
console.log('Services in database:');
console.table(allServices);

process.exit(0);
