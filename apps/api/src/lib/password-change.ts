import { sqliteDb } from "../db/index.js";

const replacePasswordTx = sqliteDb.transaction(
  (input: {
    userId: string;
    passwordHash: string;
    expectedPasswordHash?: string;
  }) => {
    const updated = input.expectedPasswordHash
      ? sqliteDb
          .prepare(
            `update users
             set password_hash = ?, auth_version = auth_version + 1
             where id = ? and password_hash = ?`,
          )
          .run(input.passwordHash, input.userId, input.expectedPasswordHash)
      : sqliteDb
          .prepare(
            `update users
             set password_hash = ?, auth_version = auth_version + 1
             where id = ?`,
          )
          .run(input.passwordHash, input.userId);
    if (updated.changes !== 1) return false;

    sqliteDb.prepare("delete from refresh_tokens where user_id = ?").run(input.userId);
    sqliteDb.prepare("delete from password_reset_tokens where user_id = ?").run(input.userId);
    return true;
  },
);

export function replacePasswordAndRevokeSessions(input: {
  userId: string;
  passwordHash: string;
  expectedPasswordHash?: string;
}) {
  return replacePasswordTx.immediate(input);
}
