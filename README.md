# Monitoring Telebot

A lightweight uptime monitoring system with Telegram alerts and a modern Admin UI.

## Features

- **HTTP/TCP Monitoring**: Check availability of websites and services.
- **Telegram Alerts**: Instant notifications when a service goes down or recovers.
- **Failure Thresholds**: Reduce noise by requiring multiple consecutive failures before alerting.
- **Admin Dashboard**: Sleek UI to manage services, track status, and view history.
- **Docker Ready**: Easy deployment using Docker and Docker Compose.

## Setup

1. **Clone and Install**:
```bash
npm install
```

2. **Configure Environment**:
Copy `.env.example` to `.env` and fill in your details:
- `TG_TOKEN`: Get this from [@BotFather](https://t.me/botfather).
- `ADMIN_CHAT_ID`: Your Telegram Chat ID.
- `JWT_SECRET`: A random secure string.

3. **Database Setup**:
```bash
npm run db:push
```

4. **Start Application**:
```bash
npm run dev
```

## Docker Deployment

```bash
docker-compose up -d
```

## Admin UI
Access the dashboard at `http://localhost:3000`. Default credentials are in your `.env` file.
