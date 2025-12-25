<!-- .github/copilot-instructions.md - Guidance for AI coding agents working on this repository -->
# Copilot / AI Agent Instructions for mern-starter

This repository is a MERN app with JWT authentication (React client + Express/Mongoose server). The goal of these instructions is to give an AI agent the immediate, actionable context needed to be productive.

- **Architecture (big picture):**
  - Two top-level services: `client/` (React app) and `server/` (Express API).
  - Data flows: React -> Axios -> Express API -> Mongoose -> MongoDB Atlas.
  - Authentication: JWT tokens stored in localStorage, managed via React Context API.
  - Key server files: `server/server.js`, `server/routes/auth.js`, `server/routes/strings.js`, `server/models/User.js`, `server/models/String.js`, `server/middleware/auth.js`.
  - Key client files: `client/src/App.js`, `client/src/context/AuthContext.js`, `client/src/pages/Login.js`, `client/src/pages/Register.js`, `client/src/components/Navbar.js`, `client/src/components/Footer.js`.

- **Run / dev workflow (what works today):**
  - Start backend: `cd server && npm run dev` (both `start` and `dev` use `nodemon`).
  - Start frontend: `cd client && npm start` (CRA dev server).
  - The `.env` belongs in `server/` and must include `MONGODB_URI` (Atlas), `JWT_SECRET` (for auth tokens), and optionally `PORT` (defaults to `5001`).
  - API documentation available at `http://localhost:5001/api-docs` (Swagger UI).

- **Project-specific conventions & patterns:**
  - ES module syntax is used (`"type": "module"` in `server/package.json`) — use `import`/`export`, not `require`.
  - API mount points: auth router at `/api/auth`, strings router at `/api/strings` in `server/server.js`.
  - Mongoose models exported as default: `User` (fields: `email`, `password`, `createdAt`), `String` (fields: `value`, `createdAt`).
  - Authentication: JWT tokens with 7-day expiration, passwords hashed with bcryptjs (10 salt rounds).
  - Client uses React Router for `/`, `/login`, `/register` routes.
  - AuthContext provides global auth state (`user`, `token`, `login`, `logout`, `loading`).
  - Navbar conditionally shows user email and Sign Out button when authenticated.
  - Client Axios calls use `http://localhost:5001/api/*` — update when changing server port or enabling proxy.

- **Integration points & external dependencies:**
  - MongoDB Atlas via `MONGODB_URI` — do not commit credentials. The repo includes `mongodb-memory-server` as a devDependency (available for test setups but no tests are configured yet).
  - CORS is enabled server-side with default options in `server/server.js` (currently permissive for localhost development).

- **API surface (examples):**
  - `POST /api/auth/register` — expects JSON `{ email, password }`. Returns `{ token, user }`. File: `server/routes/auth.js`.
  - `POST /api/auth/login` — expects JSON `{ email, password }`. Returns `{ token, user }`. File: `server/routes/auth.js`.
  - `POST /api/strings` — expects JSON `{ value: string }`. File: `server/routes/strings.js`.
  - `GET /api/strings` — returns saved strings sorted by newest. File: `server/routes/strings.js`.
  - Full API docs at `/api-docs` endpoint (Swagger).

- **Editing guidance (practical tips for changes):**
  - When editing server code remember ES modules and top-level `await` is not used — keep async functions in routes.
  - User model pre-save hook uses Mongoose 9 async/await pattern (no callback-style `next()`).
  - Update CORS origin in `server/server.js` if you change the client host or enable HTTPS.
  - If adding tests that touch MongoDB, prefer `mongodb-memory-server` to avoid needing Atlas credentials in CI.
  - Use ESLint (`npm run lint`) before committing — both client and server have linting configured.
  - Update CHANGELOG.md files when making changes (enforced by pre-commit hook).

- **Where to look for examples in the codebase:**
  - Authentication routes: `server/routes/auth.js` (JWT generation, bcrypt password hashing, error handling).
  - Protected routes pattern: `server/middleware/auth.js` (JWT verification middleware).
  - User model with password hashing: `server/models/User.js` (pre-save hook, password comparison method).
  - Route + controller pattern: `server/routes/strings.js` (simple route handler with validation and error responses).
  - React Context for state: `client/src/context/AuthContext.js` (auth state management with useMemo).
  - Protected client routes: `client/src/App.js` (React Router setup with AuthProvider).
  - Form components: `client/src/pages/Login.js`, `client/src/pages/Register.js` (controlled forms with error handling).
  - Responsive navbar: `client/src/components/Navbar.js` (Tailwind CSS, mobile menu, conditional rendering based on auth).

- **Scripts & debugging:**
  - Backend logs to console on successful MongoDB connection and server start (see `server/server.js`). Use those logs to confirm environment variables are loaded.
  - Use `nodemon` for server hot-reload; change `server/package.json` scripts only if you understand the development workflow.
  - Server scripts: `npm test` (Jest), `npm run test:coverage` (coverage report), `npm run lint` (ESLint).
  - Client scripts: `npm start` (dev server), `npm test` (Jest), `npm run lint` (ESLint), `npm run build` (production build).
  - Authentication errors logged to console with development mode details (check `process.env.NODE_ENV`).

If anything here is unclear or you want more examples (unit tests, CI hints, or a small integration test using `mongodb-memory-server`), tell me which area to expand and I will update this file.
