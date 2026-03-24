import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const userAccounts = pgTable('user_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique(),
  identifier: text('identifier').unique().notNull(),
  displayName: text('display_name'),
  roles: text('roles').array().default(['player']),
  preferences: jsonb('preferences').notNull().default({}),
  role: text('role').notNull().default('user'),
  authProvider: text('auth_provider').notNull().default('local'),
  supabaseUserId: text('supabase_user_id'),
  passwordHash: text('password_hash'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
