# Course Management API

A TypeScript REST API for managing the SQLite database containing users, courses, modules, contents, and attendance records.

## Run in development mode

Use Postman to make the tests or the back-end, it was not tested on powershell.
The API starts at `http://localhost:3000` by default.

## Configuration

Copy `.env.example` to `.env` and adjust the values when needed. The API loads this file automatically.

The API uses these environment variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `DB_PATH` | `./data/course_management.db` | SQLite database file path |

The database and tables are created automatically on startup if they do not already exist. Existing tables and records are not dropped or recreated. To use a database you already have, set `DB_PATH` to its file path.

## API endpoints

Every resource supports `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`.

- `GET /api/{resource}`: list all records.
- `GET /api/{resource}/id`: get one record.
- `POST /api/{resource}`: create a record.
- `PUT /api/{resource}/id`: replace all editable fields of a record.
- `PATCH /api/{resource}/id`: update only the supplied fields.
- `DELETE /api/{resource}/id`: delete a record.

## Example requests

### Create a user

POST http://localhost:3000/api/users

{
  "name": "Alex Morgan",
  "email": "alex.morgan@example.com",
  "status": true,
  "creationdate": "2026-11-03"
}

### Create a course

POST http://localhost:3000/api/courses

{
  "uniquecode": "CS101",
  "tittle": "Programming",
  "description": "Introduction to programming concepts.",
  "creationdate": "2026-11-03",
  "userID": 1
}

### Create a module

POST http://localhost:3000/api/modules

{
  "courseID": 1,
  "tittle": "Basics",
  "description": "Basic programming concepts.",
  "userID": 1
}

### Create content

POST http://localhost:3000/api/contents

{
  "moduleID": 1,
  "tittle": "Variables",
  "content": "An introduction to variables."
}

### Create an attendance record

POST http://localhost:3000/api/attendance

{
  "userID": 1,
  "contentID": 1,
  "watched": false
}

### Update only the watched status

PATCH http://localhost:3000/api/attendance/1

{
  "watched": true
}

## Important implementation notes

- The `attendance` table has no declared primary key. The API uses SQLite's internal `rowid` as the record identifier. This does not require changing the existing table.
- Boolean values are accepted and returned as JSON booleans, even though SQLite stores them as integer values.
- Content CRUD is available at both `/api/contents` and `/api/content`.
- Dates must use `YYYY-MM-DD` format.
- Foreign key constraints are enabled. A parent record cannot be deleted while dependent records still reference it. Delete dependent records first.
- `name`, `email`, and `uniquecode` must remain unique as defined by the database.
- This initial backend does not include authentication or authorization. Add those before exposing it to untrusted users or the public internet.
