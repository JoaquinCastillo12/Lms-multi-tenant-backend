export interface Env {
  DB: D1Database;
  KV_SESSIONS: KVNamespace;
  R2_BUCKET: R2Bucket;
  JWT_SECRET: string;
  API_KEY: string;
}

export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  academy_id: string;
}

export interface Academy {
  id: string;
  name: string;
}

export interface Course {
  id: string;
  title: string;
  academy_id: string;
  instructor_user_id: string;
}

export interface Lesson {
  id: string;
  title: string;
  status: 'draft' | 'published';
  course_id: string;
  author_user_id: string;
}

export interface Material {
  id: string;
  filename: string;
  url_r2: string;
  lesson_id: string;
}

export interface UserJWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  academyId: string;
  iat: number;
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    academyId: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface CreateCourseRequest {
  title: string;
  instructor_user_id: string;
}

export interface UpdateCourseRequest {
  title?: string;
  instructor_user_id?: string;
}

export interface CreateLessonRequest {
  title: string;
  status: 'draft' | 'published';
  course_id: string;
}

export interface UpdateLessonRequest {
  title?: string;
  status?: 'draft' | 'published';
}

export interface CreateMaterialRequest {
  filename: string;
  url_r2: string;
  lesson_id: string;
}

export interface UpdateMaterialRequest {
  filename?: string;
  url_r2?: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  role?: UserRole;
}