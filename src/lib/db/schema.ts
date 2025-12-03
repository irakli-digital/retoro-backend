import { pgTable, text, timestamp, integer, boolean, decimal, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  password: text("password"), // Nullable for OAuth users
  name: text("name"),
  appleUserId: text("apple_user_id").unique(), // Apple's sub claim
  googleUserId: text("google_user_id").unique(), // Google's sub claim
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  appleUserIdIdx: index("apple_user_id_idx").on(table.appleUserId),
  googleUserIdIdx: index("google_user_id_idx").on(table.googleUserId),
}));

// Sessions table
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  anonymousUserId: text("anonymous_user_id"), // For migration from anonymous users
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("token_idx").on(table.token),
  userIdIdx: index("user_id_idx").on(table.userId),
  anonymousUserIdIdx: index("anonymous_user_id_idx").on(table.anonymousUserId),
}));

// Magic link tokens
export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("magic_token_idx").on(table.token),
  emailIdx: index("magic_email_idx").on(table.email),
}));

// Retailer policies
export const retailerPolicies = pgTable("retailer_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  returnWindowDays: integer("return_window_days").notNull(), // 0 means unlimited
  websiteUrl: text("website_url"),
  returnPortalUrl: text("return_portal_url"),
  hasFreeReturns: boolean("has_free_returns").default(false).notNull(),
  isCustom: boolean("is_custom").default(false).notNull(), // User-created retailers
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("retailer_name_idx").on(table.name),
}));

// Return items
export const returnItems = pgTable("return_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  retailerId: uuid("retailer_id").references(() => retailerPolicies.id, { onDelete: "cascade" }).notNull(),
  name: text("name"),
  price: decimal("price", { precision: 10, scale: 2 }),
  originalCurrency: text("original_currency").notNull().default("USD"),
  priceUsd: decimal("price_usd", { precision: 10, scale: 2 }),
  currencySymbol: text("currency_symbol").notNull().default("$"),
  purchaseDate: timestamp("purchase_date").notNull(),
  returnDeadline: timestamp("return_deadline").notNull(),
  isReturned: boolean("is_returned").default(false).notNull(),
  isKept: boolean("is_kept").default(false).notNull(),
  returnedDate: timestamp("returned_date"),
  keptDate: timestamp("kept_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull(),
}, (table) => ({
  userIdIdx: index("return_items_user_id_idx").on(table.userId),
  retailerIdIdx: index("return_items_retailer_id_idx").on(table.retailerId),
  deadlineIdx: index("return_deadline_idx").on(table.returnDeadline),
  isReturnedIdx: index("is_returned_idx").on(table.isReturned),
}));

// User settings
export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).unique().notNull(),
  preferredCurrency: text("preferred_currency").notNull().default("USD"),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true).notNull(),
  pushNotificationsEnabled: boolean("push_notifications_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("settings_user_id_idx").on(table.userId),
}));

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  returnItems: many(returnItems),
  settings: one(userSettings),
  customRetailers: many(retailerPolicies),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  user: one(users, {
    fields: [returnItems.userId],
    references: [users.id],
  }),
  retailer: one(retailerPolicies, {
    fields: [returnItems.retailerId],
    references: [retailerPolicies.id],
  }),
}));

export const retailerPoliciesRelations = relations(retailerPolicies, ({ many, one }) => ({
  returnItems: many(returnItems),
  creator: one(users, {
    fields: [retailerPolicies.createdBy],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));
