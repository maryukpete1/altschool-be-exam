# Blogging API

A RESTful API for a blogging platform built with Node.js, Express, and MongoDB.

## Features

- User authentication (JWT)
- Blog creation, reading, updating, and deletion
- Pagination, filtering, and sorting
- Reading time calculation
- Comprehensive tests

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your `.env` file (see `.env.example`)
4. Start the server: `npm run dev`

## API Endpoints

### Auth
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/me` - Get current user data

### Blogs
- `GET /api/blogs` - Get all published blogs (paginated)
- `GET /api/blogs/my-blogs` - Get current user's blogs (requires auth)
- `GET /api/blogs/:id` - Get a single blog
- `POST /api/blogs` - Create a new blog (requires auth)
- `PUT /api/blogs/:id` - Update a blog (requires auth)
- `DELETE /api/blogs/:id` - Delete a blog (requires auth)

## Testing

Run tests with: `npm test`