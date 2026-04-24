import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { TacticDocumentV1 } from "@basketball/shared";

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: text("role").notNull().default("coach"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const refreshTokens = sqliteTable(
  "refresh_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("idx_refresh_user").on(t.userId)],
);

export const teams = sqliteTable(
  "teams",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#e53935"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("idx_teams_user").on(t.userId)],
);

export const plays = sqliteTable(
  "plays",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    tags: text("tags", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    document: text("document", { mode: "json" }).$type<TacticDocumentV1>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("idx_plays_user").on(t.userId), index("idx_plays_user_updated").on(t.userId, t.updatedAt)],
);

export const playShares = sqliteTable(
  "play_shares",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    playId: text("play_id")
      .notNull()
      .references(() => plays.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("idx_shares_play").on(t.playId)],
);

export type UserRow = typeof users.$inferSelect;
export type TeamRow = typeof teams.$inferSelect;
export type PlayRow = typeof plays.$inferSelect;
export type PlayShareRow = typeof playShares.$inferSelect;
