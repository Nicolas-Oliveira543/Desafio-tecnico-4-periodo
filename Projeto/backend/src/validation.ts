import { z } from "zod";

const isValidCalendarDate = (value: string): boolean => {
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
};

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .refine(isValidCalendarDate, "Date must be a valid calendar date.")
  .nullable()
  .optional();

const positiveId = z.number().int().positive();

export const userSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(200),
    status: z.boolean().nullable().optional(),
    creationdate: optionalDate,
    updatedate: optionalDate
  })
  .strict();

export const courseSchema = z
  .object({
    uniquecode: z.string().trim().min(1).max(20),
    tittle: z.string().trim().min(1).max(20),
    description: z.string().trim().min(1).max(250),
    creationdate: optionalDate,
    updatedate: optionalDate,
    userID: positiveId
  })
  .strict();

export const moduleSchema = z
  .object({
    courseID: positiveId,
    tittle: z.string().trim().min(1).max(20),
    description: z.string().trim().min(1).max(250),
    creationdate: optionalDate,
    updatedate: optionalDate,
    userID: positiveId
  })
  .strict();

export const contentSchema = z
  .object({
    moduleID: positiveId,
    tittle: z.string().trim().min(1).max(20),
    content: z.string().trim().min(1).max(200),
    creationdate: optionalDate,
    updatedate: optionalDate
  })
  .strict();

export const attendanceSchema = z
  .object({
    userID: positiveId,
    contentID: positiveId,
    watched: z.boolean().nullable().optional()
  })
  .strict();
