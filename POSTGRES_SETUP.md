# PostgreSQL Setup Guide for Dokploy

This guide explains how to set up PostgreSQL for the monitoring telebot on Dokploy.

## Quick Setup on Dokploy

### 1. Create PostgreSQL Database

1. **Log into Dokploy dashboard**
2. **Navigate to Databases** (or similar section)
3. **Create a new PostgreSQL database**:
   - Name: `monitoring_telebot`
   - Version: PostgreSQL 16 (or latest available)
   - Username: `monitoring` (or your choice)
   - Password: Generate a strong password
4. **Save the connection details**

### 2. Get the Connection String

Dokploy will provide a connection string in this format:
```
postgresql://username:password@host:port/database
```

Example:
```
postgresql://monitoring:secretpass123@postgres.dokploy.internal:5432/monitoring_telebot
```

### 3. Configure Environment Variable

1. Go to your **monitoring_telebot application** settings
2. Find **Environment Variables** section
3. Add or update:
   ```
   DATABASE_URL=postgresql://monitoring:secretpass123@postgres.dokploy.internal:5432/monitoring_telebot
   ```
4. **Save** the configuration

### 4. Deploy the Application

1. **Push your code** to GitHub (if not already done)
2. **Redeploy** the application in Dokploy
3. The application will automatically:
   - Connect to PostgreSQL
   - Run migrations (`drizzle-kit push`)
   - Start the server

---

## Verification

### Check if it's working:

1. **View application logs** in Dokploy
2. Look for successful database connection messages
3. **Login to admin panel**
4. **Add a test service**
5. **Stop and restart** the application
6. **Verify the service is still there** ✅

---

## Local Development

### Using Docker Compose:

```bash
# Start PostgreSQL and the app
docker-compose up

# The app will be available at http://localhost:3000
# PostgreSQL will be at localhost:5432
```

### Using Local PostgreSQL:

1. **Install PostgreSQL** on your machine
2. **Create database**:
   ```bash
   createdb monitoring_telebot
   ```
3. **Update .env**:
   ```
   DATABASE_URL=postgresql://your_username:your_password@localhost:5432/monitoring_telebot
   ```
4. **Run migrations**:
   ```bash
   npm run db:push
   ```
5. **Start the app**:
   ```bash
   npm start
   ```

---

## Troubleshooting

### Connection Refused

- ✅ Check DATABASE_URL is correct
- ✅ Verify PostgreSQL service is running
- ✅ Check firewall/network settings

### Authentication Failed

- ✅ Verify username and password
- ✅ Check for special characters in password (URL encode them)

### SSL Error

If you get SSL errors, update your DATABASE_URL:
```
postgresql://user:pass@host:5432/db?sslmode=require
```

Or in code, the connection already handles SSL for production.

### Migration Errors

If `drizzle-kit push` fails:
```bash
# Check the database is accessible
npx drizzle-kit studio

# Manually run migrations
npx drizzle-kit push
```

---

## Benefits of PostgreSQL

✅ **No volume mounts needed** - data persists independently  
✅ **Better performance** - handles concurrent connections better  
✅ **Easier backups** - Dokploy likely has automated backups  
✅ **Production-ready** - more robust than SQLite  

---

## Connection String Format

```
postgresql://[username]:[password]@[host]:[port]/[database]?[options]
```

**Components:**
- `username`: Database user
- `password`: User password
- `host`: Database server hostname
- `port`: Usually `5432`
- `database`: Database name
- `options`: Optional parameters like `sslmode=require`

**Example:**
```
postgresql://monitoring:mypass123@db.example.com:5432/monitoring_telebot?sslmode=require
```
