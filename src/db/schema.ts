import {relations} from 'drizzle-orm';
import {integer, pgTable, serial, text, timestamp} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const telemetrySnapshots = pgTable('telemetry_snapshots', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  zoneId: text('zone_id').notNull(),
  zoneName: text('zone_name').notNull(),
  dCiScore: integer('dci_score').notNull(),
  correctedPm25: text('corrected_pm25').notNull(),
  humidityRh: integer('humidity_rh').notNull(),
  fiberLatencyMs: text('fiber_latency_ms').notNull(),
  windShareMw: integer('wind_share_mw').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const aiSessions = pgTable('ai_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  sessionType: text('session_type').notNull(),
  modelUsed: text('model_used').notNull(),
  prompt: text('prompt').notNull(),
  responseText: text('response_text').notNull(),
  groundingLinksJson: text('grounding_links_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({many}) => ({
  telemetrySnapshots: many(telemetrySnapshots),
  aiSessions: many(aiSessions),
}));

export const telemetrySnapshotsRelations = relations(telemetrySnapshots, ({one}) => ({
  author: one(users, {
    fields: [telemetrySnapshots.userId],
    references: [users.id],
  }),
}));

export const aiSessionsRelations = relations(aiSessions, ({one}) => ({
  author: one(users, {
    fields: [aiSessions.userId],
    references: [users.id],
  }),
}));
