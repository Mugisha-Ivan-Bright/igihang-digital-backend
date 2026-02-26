# Task Deadline Monitoring System

## Overview
Automated cron-based system for monitoring task deadlines and sending notifications.

## Features

### 1. Automatic Overdue Detection
- **Schedule**: Runs daily at midnight (00:00)
- **Function**: Checks all tasks and updates status to `OVERDUE` if deadline has passed
- **Notifications**: Sends alerts to both assignees and issuers

### 2. Deadline Reminders
- **Schedule**: Runs daily at 9:00 AM
- **Function**: Sends reminders for tasks due within 3 days
- **Notifications**: Notifies assignees and issuers about approaching deadlines

## Manual Triggers (Admin Only)

### Check Overdue Tasks
```
POST /tasks/scheduler/check-overdue
Authorization: Bearer {admin_token}
```

### Send Deadline Reminders
```
POST /tasks/scheduler/send-reminders
Authorization: Bearer {admin_token}
```

## Security
- All manual endpoints require `SUPER_ADMIN` role
- Protected by JWT authentication
- Automatic cron jobs run in background without authentication

## Logging
All scheduler operations are logged with timestamps:
- Task updates
- Notification counts
- Error handling

## Configuration
Cron schedules can be modified in `task-scheduler.service.ts`:
- `EVERY_DAY_AT_MIDNIGHT` - Overdue check
- `EVERY_DAY_AT_9AM` - Deadline reminders

## Testing
Use the manual trigger endpoints to test functionality without waiting for scheduled runs.
