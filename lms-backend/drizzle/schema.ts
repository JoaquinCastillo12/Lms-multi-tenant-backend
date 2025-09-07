// src/drizzle/schema.ts
import { sqliteTable, text } from "drizzle-orm/sqlite-core";


// Academies
export const academies = sqliteTable("academies", {
  id: text().primaryKey(), 
  name: text().notNull(),
});


// Users
export const users = sqliteTable("users", {
  id: text().primaryKey(),
  email: text().notNull(),
  password_hash: text().notNull(),
  role: text().notNull(), // "admin" | "teacher" | "student"
  academy_id: text().notNull(),
});

// Courses
export const courses = sqliteTable("courses", {
  id: text().primaryKey(),
  title: text().notNull(),
  academy_id: text().notNull(),
  instructor_user_id: text().notNull(),
});

// Lessons
export const lessons = sqliteTable("lessons", {
  id: text().primaryKey(),
  title: text().notNull(),
  status: text().notNull(), // "draft" | "published"
  course_id: text().notNull(),
  author_user_id: text().notNull(),
});


// Materials
export const materials = sqliteTable("materials", {
  id: text().primaryKey(),
  filename: text().notNull(),
  url_r2: text().notNull(),
  lesson_id: text().notNull(),
});
