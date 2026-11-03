import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const configuredDatabasePath = process.env.DB_PATH ?? "./data/course_management.db";
const databasePath = resolve(configuredDatabasePath);

mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);

// Foreign key enforcement must be enabled for every SQLite connection.
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

// The schema mirrors the tables supplied for this project.
// IF NOT EXISTS allows the API to start without recreating existing data.
const schema = `
  CREATE TABLE IF NOT EXISTS user (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL UNIQUE,
    email VARCHAR(200) NOT NULL UNIQUE,
    status BOOLEAN,
    creationdate DATE,
    updatedate DATE
  );

  CREATE TABLE IF NOT EXISTS course (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    uniquecode VARCHAR(20) NOT NULL UNIQUE,
    tittle VARCHAR(20) NOT NULL,
    description VARCHAR(250) NOT NULL,
    creationdate DATE,
    updatedate DATE,
    userID INTEGER NOT NULL,
    FOREIGN KEY (userID) REFERENCES user(ID)
  );

  CREATE TABLE IF NOT EXISTS module (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    courseID INTEGER NOT NULL,
    tittle VARCHAR(20) NOT NULL,
    description VARCHAR(250) NOT NULL,
    creationdate DATE,
    updatedate DATE,
    userID INTEGER NOT NULL,
    FOREIGN KEY (userID) REFERENCES user(ID),
    FOREIGN KEY (courseID) REFERENCES course(ID)
  );

  CREATE TABLE IF NOT EXISTS content (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    moduleID INTEGER NOT NULL,
    tittle VARCHAR(20) NOT NULL,
    content VARCHAR(200) NOT NULL,
    creationdate DATE,
    updatedate DATE,
    FOREIGN KEY (moduleID) REFERENCES module(ID)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    userID INTEGER NOT NULL,
    contentID INTEGER NOT NULL,
    watched BOOLEAN,
    FOREIGN KEY (userID) REFERENCES user(ID),
    FOREIGN KEY (contentID) REFERENCES content(ID)
  );

  CREATE INDEX IF NOT EXISTS idx_course_user_id ON course(userID);
  CREATE INDEX IF NOT EXISTS idx_module_course_id ON module(courseID);
  CREATE INDEX IF NOT EXISTS idx_module_user_id ON module(userID);
  CREATE INDEX IF NOT EXISTS idx_content_module_id ON content(moduleID);
  CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(userID);
  CREATE INDEX IF NOT EXISTS idx_attendance_content_id ON attendance(contentID);
`;

db.exec(schema);

export function closeDatabase(): void {
  if (db.open) {
    db.close();
  }
}
