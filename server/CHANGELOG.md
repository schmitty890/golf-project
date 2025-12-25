# Changelog

All notable changes to the server project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-11-24

### Added
- User authentication system with JWT
- User model with email and hashed password fields
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login with credentials
- Authentication middleware for JWT verification
- Password hashing with bcryptjs (salt rounds: 10)
- JWT token generation with 7-day expiration
- Swagger documentation for authentication endpoints
- .env.example file with JWT_SECRET documentation
- Error logging for authentication endpoints
- Development mode error details in API responses

### Fixed
- Updated User model pre-save hook for Mongoose 9 compatibility (removed callback-style next())
- Fixed "next is not a function" error in password hashing

### Security
- Passwords are salted and hashed before storing in database
- JWT tokens for secure authentication
- Email validation and uniqueness enforcement
- Minimum password length requirement (6 characters)

### Dependencies
- Added `bcryptjs@^3.0.3`
- Added `jsonwebtoken@^9.0.2`

## [1.1.1] - 2025-11-23

### Added
- ESLint with Airbnb base style guide configuration
- ESLint plugins: import
- NPM scripts for linting: `lint` and `lint:fix`

### Changed
- Fixed all ESLint violations in codebase
- Updated test setup to use Object.keys() instead of for...in loop
- Added consistent return statements in route handlers
- Added eslint-disable comments for intentional await-in-loop usage

### Dependencies
- Added `eslint@^8.57.1`
- Added `eslint-config-airbnb-base@^15.0.0`
- Added `eslint-plugin-import@^2.32.0`

## [1.1.0] - 2025-11-23

### Added
- Jest testing framework with 4 basic route tests
- Test coverage reporting (HTML, text, lcov formats)
- MongoDB Memory Server for isolated testing
- Swagger UI API documentation at `/api-docs`
- JSDoc comments for API endpoints
- Test scripts: `test`, `test:watch`, `test:coverage`
- Coverage directory to .gitignore

### Changed
- Updated package.json with test dependencies
- Enhanced routes with Swagger documentation

### Dependencies
- Added `jest@^30.2.0`
- Added `supertest@^7.1.4`
- Added `@types/jest@^30.0.0`
- Added `mongodb-memory-server@^10.3.0`
- Added `swagger-jsdoc@^6.2.8`
- Added `swagger-ui-express@^5.0.1`

## [1.0.0] - 2025-11-22

### Added
- Initial Express server setup
- MongoDB Atlas connection
- String model with Mongoose schema
- POST `/api/strings` - Create new string
- GET `/api/strings` - Retrieve all strings
- CORS middleware
- Environment variables support with dotenv
- Nodemon for development

### Dependencies
- `express@^5.1.0`
- `mongoose@^9.0.0`
- `cors@^2.8.5`
- `dotenv@^17.2.3`
- `nodemon@^3.1.11`
