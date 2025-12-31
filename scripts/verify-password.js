import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

dotenv.config();

const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

console.log('\n=== Password Verification ===');
console.log(`Email from .env: ${adminEmail}`);
console.log(`Password from .env: ${adminPassword}`);

const [user] = await db.select().from(users).where(eq(users.email, adminEmail));

if (!user) {
    console.log('❌ User not found in database!');
} else {
    console.log(`✓ User found in database`);
    console.log(`  Stored hash: ${user.passwordHash.substring(0, 20)}...`);

    const isMatch = await bcrypt.compare(adminPassword, user.passwordHash);
    console.log(`  Password match: ${isMatch ? '✓ YES' : '❌ NO'}`);

    if (!isMatch) {
        console.log('\n⚠️  The password in .env does NOT match the stored hash!');
        console.log('The server needs to restart to update the password.');
    } else {
        console.log('\n✓ Password is correct! Login should work.');
    }
}
process.exit(0);
