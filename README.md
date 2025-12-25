# MERN Stack Application with Authentication

A full-stack application built with the MERN stack (MongoDB, Express, React, Node.js) featuring user authentication and data management.

## Project Structure

```
mern-starter/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   ├── Footer.js
│   │   │   └── StringForm.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   └── Register.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                 # Express backend
│   ├── models/
│   │   ├── String.js      # MongoDB schema
│   │   └── User.js        # User model
│   ├── routes/
│   │   ├── strings.js     # API routes
│   │   └── auth.js        # Auth routes
│   ├── middleware/
│   │   └── auth.js        # JWT middleware
│   ├── .env               # Environment variables
│   ├── .gitignore
│   ├── server.js          # Express server
│   └── package.json
└── README.md
```

## Features

- User authentication with JWT tokens
- User registration and login
- Password hashing with bcrypt
- Protected routes with authentication middleware
- Save string values to MongoDB Atlas
- Retrieve all saved strings
- Responsive navbar with mobile support
- Real-time form validation
- Success/error message display
- Hot reload for development (frontend and backend)
- ES6 module syntax
- API documentation with Swagger
- ESLint code quality checks

## Tech Stack

### Frontend
- **React** - UI library
- **React Router** - Client-side routing
- **Axios** - HTTP client for API requests
- **Tailwind CSS** - Utility-first CSS framework
- **Context API** - State management for authentication

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB Atlas** - Cloud database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Swagger** - API documentation
- **dotenv** - Environment variable management
- **CORS** - Cross-origin resource sharing

### Development Tools
- **Nodemon** - Auto-restart server on changes
- **Create React App** - React development environment
- **ESLint** - Code linting and quality checks
- **Jest** - Testing framework

## Prerequisites

- Node.js (v20.x or higher)
- npm or yarn
- MongoDB Atlas account

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/schmitty890/mern-starter.git
cd mern-starter
```

### 2. Install backend dependencies
```bash
cd server
npm install
```

### 3. Install frontend dependencies
```bash
cd ../client
npm install
```

### 4. Configure environment variables

Create a `.env` file in the `server` folder:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5001
```

Replace `your_mongodb_atlas_connection_string` with your actual MongoDB Atlas connection string and `your_jwt_secret_key` with a secure random string.

## Running the Application

### Start the backend server
```bash
cd server
npm run dev
```
Server will run on `http://localhost:5001`

### Start the frontend (in a new terminal)
```bash
cd client
npm start
```
Frontend will run on `http://localhost:3000`

## API Documentation

Visit `http://localhost:5001/api-docs` when the server is running to view the complete Swagger API documentation.

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  }
}
```

#### POST /api/auth/login
Login with existing credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  }
}
```

### Strings

#### POST /api/strings
Save a new string to the database.

**Request Body:**
```json
{
  "value": "your string here"
}
```

**Response (201):**
```json
{
  "message": "String saved successfully",
  "data": {
    "_id": "...",
    "value": "your string here",
    "createdAt": "2025-11-23T..."
  }
}
```

### GET /api/strings
Retrieve all saved strings, sorted by creation date (newest first).

**Response (200):**
```json
[
  {
    "_id": "...",
    "value": "string 1",
    "createdAt": "2025-11-23T..."
  },
  {
    "_id": "...",
    "value": "string 2",
    "createdAt": "2025-11-23T..."
  }
]
```

## Development Scripts

### Backend (server/)
- `npm start` - Start server with nodemon
- `npm run dev` - Start server in development mode
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

### Frontend (client/)
- `npm start` - Start React development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## MongoDB Schema

**User Model:**
```javascript
{
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

**String Model:**
```javascript
{
  value: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | Secret key for JWT token generation | `your-secure-random-string` |
| `PORT` | Server port number | `5001` |

## Notes

- Port 5000 is often used by macOS AirPlay Receiver, so we use port 5001
- The `.env` file is git-ignored to protect sensitive credentials
- CORS is configured to allow requests from `http://localhost:3000`
- Both frontend and backend support hot reload during development

## License

ISC

## Author

Jason Schmitt
