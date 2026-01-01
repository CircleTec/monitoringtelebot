# Fixing Database Persistence on Dokploy

## The Problem

Your services are being deleted when you stop/restart on Dokploy because **the database file is inside the container**, not on a persistent volume. When the container is recreated, the database is lost.

## The Solution

You need to configure a **persistent volume mount** in Dokploy's UI.

---

## Step-by-Step Instructions

### 1. Access Your Dokploy Application Settings

1. Log into your Dokploy dashboard
2. Navigate to your `monitoring_telebot` application
3. Go to the **Settings** or **Configuration** tab

### 2. Add a Volume Mount

Look for a section called **Volumes**, **Mounts**, or **Storage**. You need to add:

**Volume Configuration:**
```
Host Path: /var/lib/dokploy/volumes/monitoring_telebot_data
Container Path: /app/data
```

Or if Dokploy uses a different format:
```
/var/lib/dokploy/volumes/monitoring_telebot_data:/app/data
```

> **Important**: The exact UI varies by Dokploy version, but you're looking for a way to map a host directory to `/app/data` inside the container.

### 3. Alternative: Use Docker Compose Deployment

If Dokploy supports Docker Compose deployments, you can switch your deployment method:

1. In Dokploy, change the deployment type from **Dockerfile** to **Docker Compose**
2. Dokploy will automatically use your `docker-compose.yml` file
3. Your existing `docker-compose.yml` already has the correct volume mount:
   ```yaml
   volumes:
     - ./data:/app/data
   ```

### 4. Redeploy the Application

After configuring the volume:
1. Click **Redeploy** or **Restart** in Dokploy
2. Wait for the deployment to complete

### 5. Verify Persistence

1. **Add a test service** through the admin panel
2. **Stop the application** in Dokploy
3. **Start the application** again
4. **Check if the service is still there** ✅

---

## Troubleshooting

### If services still disappear:

1. **Check the volume mount is correct**:
   - Container path MUST be: `/app/data`
   - Host path can be anywhere on the Dokploy server

2. **Check file permissions**:
   - The volume directory must be writable by the `node` user (UID 1000)
   - You may need to SSH into the Dokploy server and run:
     ```bash
     sudo chown -R 1000:1000 /var/lib/dokploy/volumes/monitoring_telebot_data
     ```

3. **Check the DATABASE_URL environment variable**:
   - In Dokploy, verify the environment variable is set to:
     ```
     DATABASE_URL=/app/data/database.sqlite
     ```
   - Or remove it entirely (the Dockerfile sets it by default)

4. **Check container logs**:
   - Look for database-related errors
   - Verify the path `/app/data/database.sqlite` is being used

---

## Quick Reference

| Setting | Value |
|---------|-------|
| Container Path | `/app/data` |
| Host Path | `/var/lib/dokploy/volumes/monitoring_telebot_data` (or similar) |
| Environment Variable | `DATABASE_URL=/app/data/database.sqlite` |

---

## Why This Happens

- **Docker containers are ephemeral** - when they're recreated, everything inside is lost
- **Volumes persist data** - they map a directory on the host machine to a directory in the container
- **Your database needs to be on a volume** - so it survives container restarts

The Dockerfile creates `/app/data` inside the container, but without a volume mount, this directory is lost when the container is recreated.
