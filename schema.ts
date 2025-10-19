import { sql } from 'drizzle-orm';
import {
  boolean,
  json,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

const uuid = sql`uuid_generate_v4()`;

export const projects = pgTable('project', {
  id: text('id').primaryKey().default(uuid).notNull(),
  name: varchar('name').notNull(),
  transcriptionModel: varchar('transcription_model').notNull(),
  visionModel: varchar('vision_model').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  content: json('content'),
  userId: varchar('user_id').notNull(),
  image: varchar('image'),
  members: text('members').array(),
  welcomeProject: boolean('demo_project').notNull().default(false),
  readOnlyToken: text('read_only_token'),
  inviteToken: text('invite_token'),
});

export const profile = pgTable('profile', {
  id: text('id').primaryKey().notNull(),
  customerId: text('customer_id'),
  subscriptionId: text('subscription_id'),
  productId: text('product_id'),
  onboardedAt: timestamp('onboarded_at'),
  // User theme preferences
  lightBackground: text('light_bg'),
  darkBackground: text('dark_bg'),
  debug: boolean('debug').notNull().default(false),
  role: text('role'),
});

export const feedback = pgTable('feedback', {
  id: text('id').primaryKey().default(uuid).notNull(),
  userId: text('user_id').notNull(),
  projectId: text('project_id'),
  kind: text('kind').notNull(),
  email: text('email'),
  title: text('title'),
  message: text('message').notNull(),
  imageUrl: text('image_url'),
  status: text('status').notNull().default('new'),
  authorName: text('author_name'),
  authorEmail: text('author_email'),
  authorAvatar: text('author_avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
