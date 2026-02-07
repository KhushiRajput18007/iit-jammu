# TaskFlow API Documentation

Complete API reference for TaskFlow task management system.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

Tokens are obtained from login/register endpoints and stored in localStorage.

## Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "data": { /* response data */ },
  "token": "jwt_token_if_applicable"
}
```

### Error Response
```json
{
  "error": "Error message describing what went wrong"
}
```

## HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Server Error

---

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Creates a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Requirements:**
- Email must be valid and unique
- Password: min 8 chars, uppercase, lowercase, number

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "employee"
  }
}
```

---

### Login User

**POST** `/auth/login`

Authenticates user and returns JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "employee"
  }
}
```

**Errors:**
- `400` - Email and password required
- `401` - Invalid email or password
- `403` - Account is deactivated

---

## Workspace Endpoints

### List Workspaces

**GET** `/workspaces`

Returns all workspaces the user is a member of.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "owner_id": 1,
    "name": "My Startup",
    "description": "Main workspace",
    "logo_url": "https://...",
    "color_scheme": "#3B82F6",
    "is_active": true,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### Create Workspace

**POST** `/workspaces`

Creates a new workspace with the user as owner/admin.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Product Team",
  "description": "Team managing our main product"
}
```

**Response (201):**
```json
{
  "message": "Workspace created successfully",
  "workspace": {
    "id": 2,
    "owner_id": 1,
    "name": "Product Team",
    "description": "Team managing our main product",
    "is_active": true,
    "created_at": "2024-02-01T10:00:00Z"
  }
}
```

---

## Project Endpoints

### List Projects

**GET** `/projects`

Lists all projects in a workspace.

**Query Parameters:**
```
workspaceId=1 (required)
```

**Response (200):**
```json
[
  {
    "id": 1,
    "workspace_id": 1,
    "name": "Dashboard Redesign",
    "description": "Complete dashboard UI overhaul",
    "icon": "layout",
    "color": "#3B82F6",
    "status": "active",
    "owner_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2024-01-20T10:00:00Z"
  }
]
```

---

### Create Project

**POST** `/projects`

Creates a new project in a workspace.

**Request Body:**
```json
{
  "workspace_id": 1,
  "name": "Mobile App",
  "description": "iOS and Android app development",
  "color": "#8B5CF6",
  "icon": "smartphone"
}
```

**Response (201):**
```json
{
  "message": "Project created successfully",
  "projectId": 2
}
```

---

## Task Endpoints

### List Tasks

**GET** `/tasks`

Lists tasks with optional filtering.

**Query Parameters:**
```
workspaceId=1 (required)
projectId=1 (optional)
status=in_progress (optional)
```

**Status Values:**
- `todo` - Not started
- `in_progress` - Currently being worked on
- `in_review` - Under review
- `completed` - Done
- `cancelled` - Cancelled

**Response (200):**
```json
[
  {
    "id": 1,
    "project_id": 1,
    "workspace_id": 1,
    "title": "Design login page",
    "description": "Create beautiful login UI",
    "status": "in_progress",
    "priority": "high",
    "assigned_to": 2,
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "due_date": "2024-02-14",
    "progress_percentage": 75,
    "created_at": "2024-01-20T10:00:00Z"
  }
]
```

---

### Create Task

**POST** `/tasks`

Creates a new task in a project.

**Request Body:**
```json
{
  "project_id": 1,
  "workspace_id": 1,
  "title": "Implement API",
  "description": "Create REST API endpoints",
  "status": "todo",
  "priority": "high",
  "assigned_to": 2,
  "due_date": "2024-02-20",
  "start_date": "2024-02-10"
}
```

**Priority Values:**
- `low`
- `medium`
- `high`
- `urgent`

**Response (201):**
```json
{
  "message": "Task created successfully",
  "taskId": 5
}
```

---

### Update Task

**PATCH** `/tasks/[id]`

Updates a specific task.

**Request Body:**
```json
{
  "title": "Updated task title",
  "status": "completed",
  "priority": "medium",
  "progress_percentage": 100,
  "assigned_to": 3,
  "due_date": "2024-02-15"
}
```

**Response (200):**
```json
{
  "message": "Task updated successfully"
}
```

---

### Delete Task

**DELETE** `/tasks/[id]`

Deletes a task permanently.

**Response (200):**
```json
{
  "message": "Task deleted successfully"
}
```

---

## Chat Endpoints

### List Chat Rooms

**GET** `/chat-rooms`

Lists all chat rooms the user is a member of.

**Query Parameters:**
```
workspaceId=1 (required)
```

**Response (200):**
```json
[
  {
    "id": 1,
    "workspace_id": 1,
    "name": "General",
    "type": "channel",
    "description": "General discussion",
    "created_by": 1,
    "is_archived": false,
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### Create Chat Room

**POST** `/chat-rooms`

Creates a new chat room or direct message.

**Request Body:**
```json
{
  "workspace_id": 1,
  "name": "Design Team",
  "type": "group",
  "description": "Discussion for design team",
  "member_ids": [2, 3, 4]
}
```

**Type Values:**
- `direct` - One-on-one chat
- `group` - Multiple members
- `channel` - Public channel

**Response (201):**
```json
{
  "message": "Chat room created successfully",
  "roomId": 5
}
```

---

### List Messages

**GET** `/messages`

Fetches messages from a chat room.

**Query Parameters:**
```
roomId=1 (required)
limit=50 (optional)
offset=0 (optional)
```

**Response (200):**
```json
[
  {
    "id": 1,
    "room_id": 1,
    "sender_id": 1,
    "content": "Hello team!",
    "message_type": "text",
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": "https://...",
    "created_at": "2024-02-07T14:30:00Z"
  }
]
```

---

### Send Message

**POST** `/messages`

Sends a message to a chat room.

**Request Body:**
```json
{
  "room_id": 1,
  "content": "Great work on this feature!",
  "message_type": "text",
  "attachment_url": null
}
```

**Message Types:**
- `text` - Regular text message
- `image` - Image attachment
- `file` - File attachment
- `system` - System message

**Response (201):**
```json
{
  "message": "Message sent successfully",
  "data": {
    "id": 100,
    "room_id": 1,
    "sender_id": 1,
    "content": "Great work on this feature!",
    "message_type": "text",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2024-02-07T14:35:00Z"
  }
}
```

---

## User Endpoints

### Get User Profile

**GET** `/users/profile`

Gets the current user's profile information.

**Response (200):**
```json
{
  "id": 1,
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "avatar_url": "https://...",
  "phone": "+1 (555) 123-4567",
  "bio": "Product manager",
  "role": "admin",
  "is_active": true,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### Update User Profile

**PATCH** `/users/profile`

Updates the current user's profile.

**Request Body:**
```json
{
  "first_name": "Jonathan",
  "last_name": "Doe",
  "avatar_url": "https://...",
  "phone": "+1 (555) 987-6543",
  "bio": "Senior Product Manager"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully"
}
```

---

## Admin Endpoints

### List Employees

**GET** `/admin/employees`

Lists all employees (admin only).

**Query Parameters:**
```
workspaceId=1 (optional)
```

**Response (200):**
```json
[
  {
    "id": 1,
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": "https://...",
    "role": "admin",
    "is_active": true,
    "workspace_role": "admin",
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### Create Employee

**POST** `/admin/employees`

Creates a new employee (admin only).

**Request Body:**
```json
{
  "email": "jane@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "manager",
  "workspace_id": 1
}
```

**Response (201):**
```json
{
  "message": "Employee created successfully",
  "employee": {
    "id": 5,
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": "manager",
    "temporary_password": "TempPass123!"
  }
}
```

---

## Analytics Endpoints

### Get Analytics Data

**GET** `/analytics`

Retrieves workspace analytics and statistics.

**Query Parameters:**
```
workspaceId=1 (required)
type=overview (optional)
```

**Type Values:**
- `overview` - Overall statistics
- `tasks` - Task statistics
- `team` - Team performance
- `milestones` - Milestone progress
- `all` - All analytics

**Response (200):**
```json
{
  "workspace_stats": {
    "team_members": 12,
    "total_projects": 5,
    "total_tasks": 156,
    "completed_tasks": 45,
    "in_progress_tasks": 30,
    "todo_tasks": 25,
    "avg_completion": 82.5
  },
  "task_stats": [
    {
      "status": "completed",
      "count": 45,
      "percentage": 28.8
    }
  ],
  "team_performance": [
    {
      "id": 1,
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "completed_tasks": 24,
      "in_progress_tasks": 3,
      "total_assigned_tasks": 30
    }
  ],
  "milestones": [
    {
      "id": 1,
      "title": "MVP Launch",
      "due_date": "2024-03-15",
      "status": "in_progress",
      "progress_percentage": 85,
      "project_name": "Main Product",
      "total_tasks": 20,
      "completed_tasks": 17
    }
  ]
}
```

---

## Error Examples

### 401 Unauthorized
```json
{
  "error": "Invalid token"
}
```

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 409 Conflict
```json
{
  "error": "Email already registered"
}
```

### 500 Server Error
```json
{
  "error": "Database query error"
}
```

---

## Rate Limiting

Currently no rate limiting implemented. Recommended limits for production:
- 100 requests per minute per IP
- 1000 requests per hour per user

---

## CORS Configuration

Currently allows all origins. For production, configure CORS in `next.config.mjs`:

```javascript
headers: () => [
  {
    source: '/api/:path*',
    headers: [
      {
        key: 'Access-Control-Allow-Origin',
        value: 'https://yourdomain.com',
      },
    ],
  },
],
```

---

## Best Practices

1. **Always include Authorization header** for protected endpoints
2. **Validate input** on the frontend before sending
3. **Handle errors gracefully** with proper error messages
4. **Use appropriate HTTP methods**: GET for retrieval, POST for creation, PATCH for updates, DELETE for deletion
5. **Check response status codes** and handle accordingly
6. **Store JWT token securely** (httpOnly cookies recommended)
7. **Refresh token before expiry** (implement token refresh endpoint)
8. **Rate limit requests** to prevent abuse

---

## Testing Endpoints with cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "first_name": "Test",
    "last_name": "User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# List Workspaces (use token from login)
curl -X GET http://localhost:3000/api/workspaces \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Create Workspace
curl -X POST http://localhost:3000/api/workspaces \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Workspace",
    "description": "Test workspace"
  }'
```

---

## Version History

### v1.0.0 (Current)
- Basic authentication
- Workspace management
- Task management
- Chat functionality
- Analytics dashboard
- User profiles

---

## Future Enhancements

- [ ] OAuth2 integration
- [ ] API rate limiting
- [ ] Webhook support
- [ ] File uploads
- [ ] Export data (CSV, PDF)
- [ ] Advanced search
- [ ] API key authentication
- [ ] Pagination for large datasets

---

For more information, refer to the main [README.md](./README.md)
