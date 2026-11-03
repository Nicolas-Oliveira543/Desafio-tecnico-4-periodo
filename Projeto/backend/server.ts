import "dotenv/config";
import express from "express";
import { db, closeDatabase } from "./database";
import { createCrudRouter, databaseErrorHandler } from "./crud-router";
import {
  attendanceSchema,
  contentSchema,
  courseSchema,
  moduleSchema,
  userSchema
} from "./validation";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json({ limit: "1mb" }));

app.get("/", (_request, response) => {
  response.json({
    name: "Course Management API",
    status: "running",
    documentation: "/api"
  });
});

app.get("/api", (_request, response) => {
  response.json({
    message: "Available CRUD resources.",
    resources: {
      users: "/api/users",
      courses: "/api/courses",
      modules: "/api/modules",
      contents: "/api/contents",
      content: "/api/content",
      attendance: "/api/attendance"
    },
    supportedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  });
});

app.use(
  "/api/users",
  createCrudRouter({
    table: "user",
    primaryKey: "ID",
    selectColumns: "ID AS id, name, email, status, creationdate, updatedate",
    schema: userSchema,
    booleanFields: ["status"]
  })
);

app.use(
  "/api/courses",
  createCrudRouter({
    table: "course",
    primaryKey: "ID",
    selectColumns: "ID AS id, uniquecode, tittle, description, creationdate, updatedate, userID",
    schema: courseSchema
  })
);

app.use(
  "/api/modules",
  createCrudRouter({
    table: "module",
    primaryKey: "ID",
    selectColumns: "ID AS id, courseID, tittle, description, creationdate, updatedate, userID",
    schema: moduleSchema
  })
);

const contentRouter = createCrudRouter({
  table: "content",
  primaryKey: "ID",
  selectColumns: "ID AS id, moduleID, tittle, content, creationdate, updatedate",
  schema: contentSchema
});

app.use("/api/contents", contentRouter);
app.use("/api/content", contentRouter);

app.use(
  "/api/attendance",
  createCrudRouter({
    table: "attendance",
    // The supplied attendance table has no declared primary key. SQLite rowid
    // is used as its API identifier without changing the original table.
    primaryKey: "rowid",
    selectColumns: "rowid AS id, userID, contentID, watched",
    schema: attendanceSchema,
    booleanFields: ["watched"]
  })
);

app.use(databaseErrorHandler);

const server = app.listen(port, () => {
  console.log(`Course Management API is running on http://localhost:${port}`);
  console.log(`SQLite database: ${db.name}`);
});

function shutdown(): void {
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
