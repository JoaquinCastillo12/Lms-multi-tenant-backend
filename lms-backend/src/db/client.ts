import { drizzle } from "drizzle-orm/d1";

export const getDb = (env: any) => drizzle(env.DB);
