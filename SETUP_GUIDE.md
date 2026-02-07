# TaskFlow Setup Guide - Step by Step

This guide will walk you through setting up TaskFlow on your local machine.

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **XAMPP or MySQL Server** - [Download XAMPP](https://www.apachefriends.org/)
- **Git** - For version control
- **Code Editor** - VS Code, WebStorm, or any IDE

## Step-by-Step Installation

### Step 1: Install Node Dependencies

```bash
# Navigate to the project directory
cd taskflow

# Install all npm packages
npm install
```

This installs all required packages including:
- Next.js and React
- Tailwind CSS
- Framer Motion for animations
- MySQL driver
- And many more...

### Step 2: Setup MySQL Database

#### If using XAMPP:

1. **Start XAMPP**
   - Open XAMPP Control Panel
   - Click "Start" next to Apache (optional)
   - Click "Start" next to MySQL
   - Wait until MySQL shows "Running"

2. **Access phpMyAdmin**
   - Open browser: http://localhost/phpmyadmin
   - You should see the phpMyAdmin interface
   - Select "New" on the left to create database or go to Import tab

3. **Create Database and Import Schema**
   - Click on "New" on the left sidebar
   - Database name: `taskflow`
   - Collation: `utf8mb4_unicode_ci`
   - Click "Create"
   
4. **Import the Schema**
   - Click on the newly created "taskflow" database
   - Click the "Import" tab
   - Click "Choose File" and select `scripts/mysql.sql`
   - Click "Import"
   - Wait for success message: "Import has been successfully finished"

5. **Verify Installation**
   - Click on the "taskflow" database
   - You should see tables like: users, workspaces, tasks, messages, etc.
   - All tables should be properly created

#### If using local MySQL:

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE taskflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taskflow;

# Import schema
SOURCE /path/to/scripts/mysql.sql;

# Verify tables
SHOW TABLES;
```

### Step 3: Configure Environment Variables

1. **Copy the environment template**
```bash
cp .env.example .env.local
```

2. **Edit .env.local file**
Open `.env.local` and update these values:

```env
# === MYSQL DATABASE ===
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=taskflow

# === APPLICATION ===
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# === AUTHENTICATION ===
JWT_SECRET=your_super_secret_jwt_key_12345_change_in_production
JWT_EXPIRY=7d

# === OPTIONAL ===
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASSWORD=your_app_password
```

**Important Notes:**
- If MYSQL_PASSWORD is empty (default for XAMPP), leave it blank
- Change JWT_SECRET to something unique for production
- NEXT_PUBLIC_APP_URL should match your domain

### Step 4: Run the Development Server

```bash
npm run dev
```

You should see:
```
> next dev
  ▲ Next.js 16.1.6
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.5s
```

### Step 5: Access the Application

1. **Open Browser**: http://localhost:3000
2. **You should see the Landing Page** with TaskFlow logo and features
3. **Create an Account**: Click "Get Started" or go to `/auth/register`
4. **Login**: Use your credentials at `/auth/login`
5. **Access Dashboard**: You should be redirected to `/dashboard`

## Verification Checklist

- [ ] Node.js installed: `node --version` shows v18+
- [ ] npm installed: `npm --version` shows v9+
- [ ] XAMPP MySQL running (green status in XAMPP Control Panel)
- [ ] phpMyAdmin accessible at `http://localhost/phpmyadmin`
- [ ] Database "taskflow" exists in phpMyAdmin
- [ ] All tables visible in taskflow database
- [ ] .env.local file created and configured
- [ ] `npm install` completed without errors
- [ ] `npm run dev` shows "Ready in X.Xs"
- [ ] http://localhost:3000 loads the landing page
- [ ] Can create account successfully
- [ ] Can login and see dashboard
- [ ] All pages accessible from sidebar

## Troubleshooting

### Issue: "ECONNREFUSED 127.0.0.1:3306"

**Cause**: MySQL is not running

**Solution**:
1. Open XAMPP Control Panel
2. Click "Start" next to MySQL
3. Wait for it to show "Running" (green)
4. Refresh your browser

### Issue: "Access denied for user 'root'@'localhost'"

**Cause**: MySQL password mismatch

**Solution**:
1. Check MYSQL_PASSWORD in .env.local
2. For XAMPP default, it should be empty
3. Try: `MYSQL_PASSWORD=`
4. Restart the dev server

### Issue: "Unknown database 'taskflow'"

**Cause**: Database not imported

**Solution**:
1. Go to phpMyAdmin
2. Verify taskflow database exists
3. Re-import `scripts/mysql.sql`:
   - Select taskflow database
   - Go to Import tab
   - Choose `scripts/mysql.sql`
   - Click Import

### Issue: "Cannot find module 'mysql2'"

**Cause**: Dependencies not installed

**Solution**:
```bash
# Clear node_modules
rm -rf node_modules
rm package-lock.json

# Reinstall
npm install

# Try again
npm run dev
```

### Issue: Port 3000 Already in Use

**Cause**: Another process using port 3000

**Solution - Option 1 (Kill Process)**:
```bash
# On macOS/Linux
lsof -i :3000
kill -9 <PID>

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Solution - Option 2 (Use Different Port)**:
```bash
PORT=3001 npm run dev
```

### Issue: Can't Login After Registration

**Cause**: Database tables not created properly

**Solution**:
1. Verify all tables exist in phpMyAdmin
2. Check that `users` table exists
3. Re-import the SQL schema
4. Clear browser localStorage: F12 > Application > Clear All

### Issue: Animations Not Working

**Cause**: Framer Motion not installed

**Solution**:
```bash
npm install framer-motion
npm run dev
```

## Using the Application

### First Login

1. **Register**: Create a new account with email and password
2. **Dashboard**: See overview of tasks and analytics
3. **Create Workspace**: Optional, you're in default workspace
4. **Create Tasks**: Click "New Task" to start
5. **Chat**: Click "Chat" to message team members

### Main Features to Try

- **Dashboard**: View analytics, team performance, and milestones
- **Tasks**: Create, assign, and manage tasks
- **Chat**: Send messages to team members
- **Settings**: Update profile and preferences
- **Analytics**: View detailed performance metrics

## File Structure Quick Reference

```
taskflow/
├── app/                      # Next.js app directory
│   ├── api/                 # API routes
│   ├── auth/                # Login/Register pages
│   ├── dashboard/           # Main dashboard
│   ├── tasks/               # Tasks management
│   ├── chat/                # Chat interface
│   ├── analytics/           # Analytics dashboard
│   ├── settings/            # User settings
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/              # React components
├── hooks/                   # Custom React hooks
├── lib/                     # Utilities (db.ts, auth.ts)
├── scripts/
│   └── mysql.sql           # Database schema
├── .env.local              # Environment variables (create this)
├── .env.example            # Example environment file
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── tailwind.config.ts      # Tailwind configuration
├── next.config.mjs         # Next.js configuration
└── README.md               # Project documentation
```

## Common Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Build
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code (if configured)

# Database
# Note: Modify scripts/mysql.sql and import via phpMyAdmin
```

## Next Steps

1. **Customize branding**: Update colors in `app/globals.css`
2. **Add team members**: Use Admin dashboard to create users
3. **Configure emails**: Set SMTP variables for notifications
4. **Deploy**: Follow Vercel deployment guide
5. **Extend features**: Add more API routes and pages

## Getting Help

1. **Check logs**: Look at browser console (F12) and terminal
2. **Database issues**: Check phpMyAdmin for table structure
3. **API issues**: Test endpoints with Postman
4. **Component issues**: Check Shadcn UI documentation

## Production Checklist

Before deploying:
- [ ] Change JWT_SECRET to random string
- [ ] Set NODE_ENV to production
- [ ] Configure real database (managed hosting)
- [ ] Setup SSL/HTTPS
- [ ] Configure email (SMTP)
- [ ] Setup monitoring/logging
- [ ] Create backup strategy
- [ ] Test all features
- [ ] Security audit
- [ ] Performance optimization

## Support Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Shadcn UI**: https://ui.shadcn.com
- **MySQL Docs**: https://dev.mysql.com/doc/

---

**Need help?** Make sure to check the main README.md for more detailed information about features and architecture.
