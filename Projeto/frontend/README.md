# Course Management Frontend

A React + TypeScript frontend for the existing Course Management REST API. This project contains only the frontend; it does not recreate database access, business rules, validation, or CRUD endpoints.

## Requirements

- Node.js 20 or newer
- npm
- The existing Course Management API running on `http://localhost:3000`

## Run alongside the existing backend

1. Keep your existing backend project unchanged.
2. Start the backend in its own terminal:

   ```bash
   npm install (dependencies)
   npm run dev
   ```

3. Open this frontend folder in another terminal and install its dependencies:

   ```bash
   npm install (dependencies)
   ```

4. Start the frontend:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:5173` in your browser.

The Vite development server proxies requests beginning with `/api` to `http://localhost:3000`. This avoids changing the existing Express backend just to enable local development across two ports.

## Production build

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`.

## API integration

The frontend uses the existing endpoints and HTTP methods:

| Resource | Endpoint | Operations |
|---|---|---|
| Users | `/api/users` | GET, POST, PUT, DELETE |
| Courses | `/api/courses` | GET, POST, PUT, DELETE |
| Modules | `/api/modules` | GET, POST, PUT, DELETE |
| Contents | `/api/contents` | GET, POST, PUT, DELETE |
| Attendance | `/api/attendance` | GET, POST, PUT, DELETE |

It expects the existing API response shape, including the `id` property returned by the API. It intentionally preserves the database/API spelling `tittle` and the relation field names `userID`, `courseID`, `moduleID`, and `contentID`.

All network calls are centralized in `src/api.ts`. The UI does not connect to SQLite directly. The backend remains responsible for data validation, database constraints, foreign keys, and persistence.

## API URL configuration

For local development, leave `VITE_API_BASE_URL` empty. The Vite proxy forwards `/api` calls to `http://localhost:3000`.

For a separately hosted API, create a `.env` file based on `.env.example` and set:

```env
VITE_API_BASE_URL=https://your-api-host.example
```

When hosting the frontend and backend on different origins in production, configure the deployment reverse proxy or enable the appropriate CORS origin in the backend. The current backend does not include CORS middleware; this frontend does not attempt to change the backend's security configuration.

## Available screens

- Overview dashboard with aggregate counts and attendance completion.
- Users management.
- Courses management, including owner selection.
- Modules management, including course and owner selection.
- Contents management, including module selection.
- Attendance management, including user/content selection and watched status.
- Create, edit, delete, search, refresh, loading, empty, and error states.

## Notes

- Related records are loaded through the existing API and shown by their names instead of only their numeric foreign keys.
- The attendance record identifier is the `id` value exposed by the backend (which uses SQLite `rowid` for this table).
- Deletion is subject to the foreign-key constraints enforced by the backend. If a related record is still in use, the API will reject deletion and the frontend will display the error.
- The frontend does not implement authentication because the existing backend does not provide authentication endpoints.
