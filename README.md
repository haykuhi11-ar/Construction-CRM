# Construction CRM

A web-based Construction Management System designed to simplify task management, coordinate construction teams, and track work progress across multiple construction sites.

## Overview

Construction CRM is a role-based application that connects managers and executors in a single workspace.

Managers can create and manage construction objects, assign tasks to executors, monitor progress, and review completed work.

Executors can access their assigned tasks, update their status, and submit completed work for manager review.

The system is built with a focus on clear workflows, role-based access control, and reliable task history.

## Features

### Manager
- View all users, construction objects, and tasks.
- Create and manage construction objects.
- Create tasks and assign them to executors.
- Reassign tasks when necessary.
- Monitor task statuses and progress.
- Review submitted tasks.
- Accept completed tasks or request revisions.
- View task and assignment history.
- Manage executor accounts.

### Executor
- View only assigned tasks.
- Access construction objects related to assigned tasks.
- Update task progress.
- Submit tasks for review.
- View manager feedback.
- Receive tasks returned for revision.

### Task Management
- Centralized task management.
- Multiple task statuses.
- Task assignment and reassignment.
- Task review workflow.
- Revision comments.
- Task history tracking.
- Soft deletion to preserve historical records.
- Unassigned tasks available for managers.

## Task Workflow

Tasks follow a structured workflow:

`New → In Progress → Under Review → Accepted`

If a manager requests changes:

`Under Review → Revision → In Progress`

A revision requires a manager comment explaining what needs to be corrected.

## User Roles

| Role | Permissions |
|---|---|
| Manager | View all users, objects, and tasks; manage tasks assigned by them; review submitted work. |
| Executor | View and manage only their assigned tasks and related objects. |

The application supports multiple managers. Managers can view tasks assigned by other managers, but cannot modify or review those tasks.

## Tech Stack

### Frontend
- React
- TypeScript
- Tailwind CSS
- Vite

### Backend & Database
- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)
- Supabase Edge Functions
- PostgreSQL Functions (RPC)

## Architecture & Security

The application uses Supabase as its backend infrastructure.

Security is enforced at the database level using Row Level Security (RLS) policies and PostgreSQL functions.

Key security principles:

- Role-based access control.
- Users can access only the data permitted by their role.
- Database mutations are performed through controlled RPC functions.
- Task history is preserved.
- Executor deactivation returns unfinished tasks to the unassigned state.
- User creation is handled through a secure Supabase Edge Function.
- The Supabase Service Role Key is never exposed in the frontend.

## Getting Started

### Prerequisites

- Node.js
- npm
- A Supabase project

### Installation

Clone the repository:

```bash
git clone <repository-url>
```

Navigate to the project directory:

```bash
cd Construction_CRM
```

Install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

Replace the placeholder values with your Supabase project credentials.

**Important:** Never expose your Supabase Service Role Key or other secret keys in frontend environment variables.

### Run Locally

Start the development server:

```bash
npm run dev
```

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Status

**In Development**

Construction CRM is currently under active development. New features, improvements, and refinements are being implemented.

## Future Improvements

- Dashboard analytics and statistics.
- Advanced task filtering and search.
- Notifications for task assignments and status changes.
- Improved reporting.
- Additional task and object management features.
- Production deployment and further optimization.

---

Built with React, TypeScript, and Supabase.