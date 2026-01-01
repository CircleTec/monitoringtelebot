# Database Persistence Setup

## Overview
This application uses SQLite for data persistence. All service configurations, logs, and user data are stored in a SQLite database located in the `data/` directory.

## How Persistence Works

### Local Development
- Database location: `./data/database.sqlite`
- The `data/` directory is automatically created when the application starts
- All services you add will be saved to this database file

### Docker/Production
- Database location: `/app/data/database.sqlite` (inside container)
- Volume mount: `./data:/app/data` (maps host `data/` to container `/app/data`)
- When you stop and restart the container, all data persists because it's stored on the host machine

## Configuration

### Environment Variable
Set `DATABASE_URL` in your `.env` file:
```bash
DATABASE_URL=./data/database.sqlite
```

### Docker Compose
The `docker-compose.yml` includes a volume mount:
```yaml
volumes:
  - ./data:/app/data
```

This ensures that:
1. The database file is stored on your host machine (not inside the container)
2. When you restart the container, it uses the same database file
3. Your services persist across container restarts

## Verifying Persistence

1. **Add a service** through the admin panel
2. **Stop the server**: `docker-compose down` (or Ctrl+C if running locally)
3. **Start the server again**: `docker-compose up` (or `npm start`)
4. **Check the admin panel** - your service should still be there

## Troubleshooting

### Services disappear after restart
- Check that the `data/` directory exists
- Verify the `DATABASE_URL` environment variable is set correctly
- Ensure the volume mount in `docker-compose.yml` is configured
- Check file permissions on the `data/` directory

### Database locked errors
- SQLite uses WAL (Write-Ahead Logging) mode for better concurrency
- Ensure only one instance of the application is running
- Check that the `data/` directory is writable

## Backup

To backup your data, simply copy the `data/` directory:
```bash
cp -r data/ data-backup-$(date +%Y%m%d)/
```

To restore:
```bash
cp -r data-backup-YYYYMMDD/ data/
```
