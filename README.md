# Expense Tracker

A full-stack web application for personal expense management with user authentication, expense tracking, and spending analytics.


## Features

**Core Features:**
- User authentication with secure password hashing (bcryptjs)
- JWT-based authorization for API protection
- Add, edit, and delete expenses
- Categorize expenses (Food, Transport, Entertainment, etc.)
- Track expenses by date
- View expense summaries by category
- Real-time expense totals
- Dark mode toggle
- Responsive grid and list view options
- Persistent data storage with MongoDB

## Tech Stack

### Frontend
- **React 18.2** - UI library
- **Vite 7.2** - Fast build tool and dev server
- **Axios** - HTTP client for API calls
- **CSS3** - Styling with dark mode support

### Backend
- **Node.js** - JavaScript runtime
- **Express.js 4.18** - Web framework
- **MongoDB 5.8** - NoSQL database
- **JWT (jsonwebtoken 9.0)** - Authentication
- **bcryptjs 2.4** - Password hashing
- **CORS 2.8** - Cross-origin resource sharing


## API Endpoints

### Authentication

- `POST /api/register` - Create new user account
  - Body: `{ username, email, password }`
  
- `POST /api/login` - User login
  - Body: `{ username, password }` or `{ email, password }`
  - Returns: JWT token

### Expenses (Protected Routes)

- `GET /api/expenses` - Get all expenses for logged-in user
- `POST /api/expenses` - Add new expense
  - Body: `{ amount, description, category, date }`
  
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### User Profile (Protected Routes)

- `GET /api/user` - Get user profile
- `PUT /api/user` - Update user profile

## Features in Detail

### Authentication System
- Passwords are securely hashed using bcryptjs
- JWT tokens are issued upon successful login/registration
- Tokens are stored in browser localStorage for persistent sessions
- All API requests require valid JWT token in Authorization header

### Expense Management
- Create expenses with amount, description, category, and date
- Edit existing expenses
- Delete expenses with confirmation
- View all expenses in grid or list layout
- Filter and organize expenses by category

### Analytics & Summary
- View category-wise expense breakdown
- Calculate total spending
- Real-time summary updates as expenses change
- Visual category distribution

### User Interface
- Light and dark mode themes
- Responsive design for desktop and mobile
- Toggle between grid and list views
- User profile management
- Logout functionality

### Data Persistence
- All data stored in MongoDB
- User credentials secured with password hashing
- Session persistence with localStorage
