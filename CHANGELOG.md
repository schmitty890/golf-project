# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Golf scorecard feature for tracking rounds
- Round model with course name, date, holes, players, and scores
- REST API endpoints for rounds (POST, GET, PUT) with JWT authentication
- Scorecard page with create/edit functionality
- Score tracking table with 18 holes, par configuration, and auto-calculated totals

### Changed
- Client now uses environment variable for API URL to support production deployment
- Fixed ESLint errors in server authentication routes and middleware
- Separated development and production databases (golf-project-dev vs golf-project)
- User model now has automatic `updatedAt` timestamp via Mongoose timestamps option

## [1.5.0] - 2025-11-25

### Changed
- Renamed project from "ctest" to "mern-starter"
- Updated package.json name field to reflect new project name
- Updated project references in README.md and copilot-instructions.md

## [1.4.0] - 2025-11-24

### Changed
- Updated README.md to document authentication features
- Added authentication endpoints documentation
- Updated project structure to show new components and pages
- Documented JWT_SECRET environment variable
- Added Swagger API documentation reference
- Updated tech stack to include React Router, Tailwind CSS, JWT, and bcrypt
- Added User model schema documentation
- Updated copilot-instructions.md to reflect authentication architecture and new patterns

## [1.3.0] - 2025-11-23

### Added
- Root package.json with monorepo scripts
- Concurrently package to run server and client simultaneously
- `npm run dev` script to start both server and client at once
- `npm run server` script to start only the server
- `npm run client` script to start only the client
- `npm run install-all` script to install all dependencies
- Root .gitignore file

### Dependencies
- Added `concurrently@^9.1.2`

## [1.2.0] - 2025-11-23

### Added
- Git pre-commit hook to enforce CHANGELOG.md updates on every commit
- Comprehensive CHANGELOG update guide at `.github/CHANGELOG_GUIDE.md`
- Automated detection of which CHANGELOG.md files need updating based on changed files
- Helpful commit-time guidance with formatting examples and instructions

### Changed
- Development workflow now requires CHANGELOG.md updates before commits are accepted
- Enhanced project documentation with changelog best practices

### Infrastructure
- Pre-commit hook intelligently routes updates to correct CHANGELOG (root, server, or client)
- Colorized terminal output for better developer experience
- Automatic date and format validation guidance

## [1.1.0] - 2025-11-23

### Added
- Server: Jest testing framework with 4 basic route tests
- Server: Test coverage reporting (HTML, text, lcov formats)
- Server: MongoDB Memory Server for isolated testing
- Server: Swagger UI API documentation at `/api-docs`
- Server: JSDoc comments for API endpoints
- CHANGELOG.md files for server, client, and root
- Semantic versioning across all packages

### Changed
- Server: Updated version from 1.0.0 to 1.1.0
- Client: Updated version from 0.1.0 to 1.0.0
- Server: Enhanced package.json with description and correct main file

### Technical Details
- See [server/CHANGELOG.md](server/CHANGELOG.md) for server-specific changes
- See [client/CHANGELOG.md](client/CHANGELOG.md) for client-specific changes

## [1.0.0] - 2025-11-22

### Added
- Initial project setup with monorepo structure
- React frontend (client)
- Express backend (server)
- MongoDB Atlas database integration
- Full-stack string management application
- CORS-enabled API communication
- Development environment setup

### Client Features
- String input form
- Display list of saved strings
- API integration with Axios

### Server Features
- REST API endpoints (GET, POST)
- MongoDB connection and models
- Environment configuration
- Development server with Nodemon

### Infrastructure
- Git repository initialization
- Environment variable management
- Separate client/server architecture
