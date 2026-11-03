import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "./database";

type ResourceConfig = {
  table: string;
  primaryKey: string;
  selectColumns: string;
  schema: z.ZodObject<any>;
  booleanFields?: string[];
};

type SqlValue = string | number | null;
type DatabaseRow = Record<string, unknown>;

function toSqlValue(value: unknown): SqlValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  throw new Error("Unsupported database value.");
}

function normalizeRow(row: DatabaseRow, booleanFields: string[] = []): DatabaseRow {
  const normalizedRow = { ...row };

  for (const field of booleanFields) {
    const value = normalizedRow[field];
    normalizedRow[field] = value === null || value === undefined ? null : Boolean(value);
  }

  return normalizedRow;
}

function parseResourceId(value: string | string[]): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsedId = Number(value);
  return Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
}

function getById(config: ResourceConfig, id: number): DatabaseRow | undefined {
  const row = db
    .prepare(`SELECT ${config.selectColumns} FROM ${config.table} WHERE ${config.primaryKey} = ?`)
    .get(id) as DatabaseRow | undefined;

  return row ? normalizeRow(row, config.booleanFields) : undefined;
}

function validateRequestBody(
  schema: z.ZodObject<any>,
  body: unknown,
  response: Response
): Record<string, unknown> | null {
  const result = schema.safeParse(body);

  if (!result.success) {
    response.status(400).json({
      error: "Validation failed.",
      details: result.error.flatten()
    });
    return null;
  }

  return result.data as Record<string, unknown>;
}

export function createCrudRouter(config: ResourceConfig): Router {
  const router = Router();

  // Read all records.
  router.get("/", (_request: Request, response: Response) => {
    const rows = db
      .prepare(`SELECT ${config.selectColumns} FROM ${config.table} ORDER BY ${config.primaryKey} DESC`)
      .all() as DatabaseRow[];

    response.json(rows.map((row) => normalizeRow(row, config.booleanFields)));
  });

  // Read one record.
  router.get("/:id", (request: Request, response: Response) => {
    const id = parseResourceId(request.params.id);

    if (id === null) {
      response.status(400).json({ error: "The record ID must be a positive integer." });
      return;
    }

    const record = getById(config, id);

    if (!record) {
      response.status(404).json({ error: "Record not found." });
      return;
    }

    response.json(record);
  });

  // Create a record.
  router.post("/", (request: Request, response: Response) => {
    const data = validateRequestBody(config.schema, request.body, response);
    if (!data) return;

    const columns = Object.keys(data);
    const placeholders = columns.map(() => "?").join(", ");
    const values = columns.map((column) => toSqlValue(data[column]));

    const result = db
      .prepare(
        `INSERT INTO ${config.table} (${columns.join(", ")}) VALUES (${placeholders})`
      )
      .run(...values);

    const record = getById(config, Number(result.lastInsertRowid));
    response.status(201).json(record);
  });

  // Replace a complete record.
  router.put("/:id", (request: Request, response: Response) => {
    const id = parseResourceId(request.params.id);

    if (id === null) {
      response.status(400).json({ error: "The record ID must be a positive integer." });
      return;
    }

    if (!getById(config, id)) {
      response.status(404).json({ error: "Record not found." });
      return;
    }

    const data = validateRequestBody(config.schema, request.body, response);
    if (!data) return;

    const columns = Object.keys(data);
    const assignments = columns.map((column) => `${column} = ?`).join(", ");
    const values = columns.map((column) => toSqlValue(data[column]));

    db.prepare(`UPDATE ${config.table} SET ${assignments} WHERE ${config.primaryKey} = ?`)
      .run(...values, id);

    response.json(getById(config, id));
  });

  // Update only the supplied fields.
  router.patch("/:id", (request: Request, response: Response) => {
    const id = parseResourceId(request.params.id);

    if (id === null) {
      response.status(400).json({ error: "The record ID must be a positive integer." });
      return;
    }

    if (!getById(config, id)) {
      response.status(404).json({ error: "Record not found." });
      return;
    }

    const data = validateRequestBody(config.schema.partial(), request.body, response);
    if (!data) return;

    const columns = Object.keys(data);
    if (columns.length === 0) {
      response.status(400).json({ error: "At least one field must be provided." });
      return;
    }

    const assignments = columns.map((column) => `${column} = ?`).join(", ");
    const values = columns.map((column) => toSqlValue(data[column]));

    db.prepare(`UPDATE ${config.table} SET ${assignments} WHERE ${config.primaryKey} = ?`)
      .run(...values, id);

    response.json(getById(config, id));
  });

  // Delete a record.
  router.delete("/:id", (request: Request, response: Response) => {
    const id = parseResourceId(request.params.id);

    if (id === null) {
      response.status(400).json({ error: "The record ID must be a positive integer." });
      return;
    }

    const result = db
      .prepare(`DELETE FROM ${config.table} WHERE ${config.primaryKey} = ?`)
      .run(id);

    if (result.changes === 0) {
      response.status(404).json({ error: "Record not found." });
      return;
    }

    response.status(200).json({ message: "Record deleted successfully." });
  });

  return router;
}

export function databaseErrorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): void {
  const databaseError = error as { code?: string; message?: string };

  if (databaseError.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
    response.status(409).json({
      error: "This operation violates a foreign key constraint.",
      message: "Check whether related records exist and whether dependent records must be deleted first."
    });
    return;
  }

  if (
    databaseError.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    databaseError.code === "SQLITE_CONSTRAINT_PRIMARYKEY"
  ) {
    response.status(409).json({
      error: "A record with the same unique value already exists."
    });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "An unexpected server error occurred." });
}
