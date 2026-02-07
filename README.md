# TaskFlow - Beautiful Task Management System

A modern, elegant task management platform built with Next.js, React, MySQL, and featuring stunning animations. Designed for startup founders and teams who want to manage projects beautifully.

## Features

### Core Features
- **User Authentication** - Secure JWT-based authentication with bcrypt password hashing
- **Workspace Management** - Create and manage multiple workspaces with team members
- **Task Management** - Create, assign, and track tasks with multiple statuses and priorities
- **Real-time Chat** - Built-in chat system for team communication
- **Analytics Dashboard** - Advanced analytics with completion trends, team productivity, and milestone tracking
- **User Profiles** - Personalized user profiles and settings
- **Admin Dashboard** - Manage employees, create team members, and oversee operations

### Beautiful Animations & UI
- Smooth page transitions with Framer Motion
- Interactive button hover effects and loading states
- Elegant form validations with real-time feedback
- Animated charts and progress indicators
- Responsive design with mobile-first approach
- Dark/Light mode support ready

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Recharts** - Chart visualizations
- **SWR** - Data fetching and caching
- **Lucide React** - Icon library
- **Shadcn/UI** - Component library

### Backend
- **Next.js API Routes** - Backend endpoints
- **MySQL** - Database
- **JWT** - Authentication tokens
- **Bcryptjs** - Password hashing
- **Axios** - HTTP client

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- MySQL Server running (via XAMPP or local installation)
- npm or yarn package manager

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup MySQL Database

1. **Open XAMPP Control Panel** and start MySQL
2. **Import the database schema**:
   - Open phpMyAdmin (usually at `http://localhost/phpmyadmin`)
   - Create a new database named `taskflow`
   - Go to Import tab
   - Select the `scripts/mysql.sql` file
   - Click Import

3. **Verify the database**:
   - You should see all the tables created in the `taskflow` database
   - Check for tables like `users`, `workspaces`, `tasks`, `messages`, etc.

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Update `.env.local` with your configuration:
```env
# MySQL Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=taskflow

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRY=7d
```

### 4. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Default Access

When the application starts, you can:
1. **Create a new account** at `/auth/register`
2. **Login** at `/auth/login`
3. **Access dashboard** after authentication at `/dashboard`

## Project Structure

```
/app
  /api              - Backend API routes
    /auth          - Authentication endpoints (login, register)
    /tasks         - Task management endpoints
    /workspaces    - Workspace endpoints
    /projects      - Project endpoints
    /messages      - Chat/messaging endpoints
    /chat-rooms    - Chat room management
    /users         - User profile endpoints
    /admin         - Admin operations (employees)
    /analytics     - Analytics data endpoints
  /auth            - Authentication pages (login, register)
  /dashboard       - Main dashboard page
  /tasks           - Tasks management page
  /chat            - Chat application page
  /analytics       - Analytics dashboard page
  /settings        - User settings page
  /layout.tsx      - Root layout with fonts and metadata
  /page.tsx        - Landing page

/components
  /ui              - Shadcn UI components
  /protected-route.tsx     - Route protection wrapper
  /dashboard-sidebar.tsx   - Main navigation sidebar

/hooks
  /use-auth.ts     - Authentication hook for client-side auth management
  /use-mobile.tsx  - Mobile detection hook

/lib
  /db.ts           - MySQL database connection pool
  /auth.ts         - Authentication utilities (JWT, password hashing)
  /utils.ts        - Utility functions

/scripts
  /mysql.sql       - Complete database schema
```

## Database Schema

The application includes a comprehensive MySQL schema with the following key tables:

### User & Authentication
- `users` - User accounts with profiles
- `sessions` - User sessions and tokens
- `workspace_members` - Workspace membership and roles
- `workspace_invitations` - Pending workspace invitations

### Tasks & Projects
- `workspaces` - Team workspaces
- `projects` - Projects within workspaces
- `tasks` - Individual tasks
- `task_comments` - Task discussion comments
- `task_assignments_history` - History of task assignments
- `status_update_history` - Task status change history
- `milestones` - Project milestones

### Communication
- `chat_rooms` - Chat channels and direct messages
- `chat_room_members` - Chat room membership
- `messages` - Individual messages
- `message_reactions` - Message emoji reactions

### Analytics & Monitoring
- `analytics_events` - User activity events
- `team_performance` - Team productivity metrics
- `activity_logs` - Audit trail of all actions
- `notifications` - User notifications

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Workspaces
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create new workspace

### Tasks
- `GET /api/tasks` - List tasks with filters
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project

### Chat
- `GET /api/chat-rooms` - List chat rooms
- `POST /api/chat-rooms` - Create chat room
- `GET /api/messages` - Fetch messages
- `POST /api/messages` - Send message

### Users
- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update profile

### Admin
- `GET /api/admin/employees` - List employees
- `POST /api/admin/employees` - Create employee

### Analytics
- `GET /api/analytics` - Get analytics data

## Authentication Flow

1. User registers or logs in
2. Server validates credentials and generates JWT token
3. Token is stored in localStorage
4. Token is sent in Authorization header for protected requests
5. Token is verified on server using JWT secret
6. Protected routes redirect to login if not authenticated

## Key Features Explanation

### Beautiful Animations
- Page transitions use Framer Motion with smooth entrance animations
- Button hovers include lift, scale, and glow effects
- Form inputs have focus animations and smooth borders
- Task lists animate in with staggered delays
- Charts animate from 0 to final values

### Task Management
- Create tasks with title, description, priority, and due date
- Assign tasks to team members
- Track task status: To Do, In Progress, In Review, Completed, Cancelled
- Filter tasks by status and priority
- Real-time task status updates

### Team Collaboration
- Create multiple workspaces
- Invite team members to workspaces
- Role-based access control (Admin, Manager, Employee)
- Direct messaging between team members
- Group chat channels

### Analytics & Insights
- Task completion trends over time
- Team productivity scores
- Milestone progress tracking
- Task distribution by priority
- Individual team member performance

## Deployment

### Using Vercel (Recommended)
1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Using Docker
Create a `Dockerfile` in the root directory:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Environment Variables

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `MYSQL_HOST` | MySQL server host | `localhost` |
| `MYSQL_PORT` | MySQL server port | `3306` |
| `MYSQL_USER` | MySQL username | `root` |
| `MYSQL_PASSWORD` | MySQL password | `` (empty) |
| `MYSQL_DATABASE` | Database name | `taskflow` |
| `JWT_SECRET` | Secret key for JWT signing | `your_secret_key` |
| `JWT_EXPIRY` | Token expiry time | `7d` |
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |
| `NODE_ENV` | Environment | `development` or `production` |

## Troubleshooting

### Database Connection Issues
- Ensure MySQL is running via XAMPP
- Check MYSQL_HOST and MYSQL_PORT in .env.local
- Verify database `taskflow` exists
- Confirm user permissions for MySQL user

### Authentication Issues
- Clear browser cache and localStorage
- Check JWT_SECRET is set correctly
- Verify token is being sent in Authorization header
- Check server logs for JWT verification errors

### Missing Tables
- Run the mysql.sql script again in phpMyAdmin
- Verify all tables exist in the taskflow database
- Check for any import errors in the Import tab

### Port Already in Use
```bash
# Find and kill process using port 3000
lsof -i :3000
kill -9 <PID>
# Or use different port
PORT=3001 npm run dev
```

## Development Tips

### Adding New Features
1. Create API route in `/app/api`
2. Add database query logic
3. Create component/page in `/app`
4. Use authenticated hooks and protected routes
5. Test thoroughly

### Styling
- Use Tailwind utility classes
- Follow the color scheme defined in globals.css
- Use design tokens for consistency
- Test light and dark modes

### Database Queries
- Use parameterized queries to prevent SQL injection
- Create indexes for frequently queried columns
- Use transactions for critical operations

## Performance Optimizations

- Images are optimized with Next.js Image component
- API routes use connection pooling
- SWR provides caching and revalidation
- Tailwind CSS is tree-shaken in production
- Framer Motion animations use GPU acceleration

## Security Best Practices

✅ Implemented:
- Password hashing with bcrypt
- JWT token-based authentication
- Parameterized SQL queries
- Input validation and sanitization
- HTTPS ready for production
- Environment variables for sensitive data
- HTTP-only cookies for future implementation

⚠️ To Implement:
- CSRF protection
- Rate limiting
- Two-factor authentication
- Email verification
- Password reset flow
- Audit logging
- Data encryption

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the database schema in `scripts/mysql.sql`
3. Check API endpoint documentation
4. Review component props in the UI folder

## Roadmap

- [ ] Real-time collaboration with Socket.io
- [ ] File attachments and storage
- [ ] Advanced filtering and search
- [ ] Custom workflows
- [ ] Integration with third-party apps
- [ ] Mobile app
- [ ] AI-powered task suggestions
- [ ] Time tracking
- [ ] Resource management

---

Built with ❤️ for startup teams. Start building beautiful!
