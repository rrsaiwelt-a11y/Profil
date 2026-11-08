import {desc, eq} from 'drizzle-orm';
import {db} from './index';
import {aiSessions, telemetrySnapshots, users} from './schema';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Nie udało się zsynchronizować profilu użytkownika.', {cause: error});
  }
}

export async function saveTelemetrySnapshotForUser(
  uid: string,
  email: string,
  payload: {
    zoneId: string;
    zoneName: string;
    dCiScore: number;
    correctedPm25: string;
    humidityRh: number;
    fiberLatencyMs: string;
    windShareMw: number;
  },
) {
  try {
    const user = await getOrCreateUser(uid, email);
    const inserted = await db
      .insert(telemetrySnapshots)
      .values({
        userId: user.id,
        zoneId: payload.zoneId,
        zoneName: payload.zoneName,
        dCiScore: payload.dCiScore,
        correctedPm25: payload.correctedPm25,
        humidityRh: payload.humidityRh,
        fiberLatencyMs: payload.fiberLatencyMs,
        windShareMw: payload.windShareMw,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database saveTelemetrySnapshot failed:', error);
    throw new Error('Nie udało się zapisać migawki telemetrii Smart Grid.', {cause: error});
  }
}

export async function listUserTelemetrySnapshots(uid: string) {
  try {
    const rows = await db
      .select({
        id: telemetrySnapshots.id,
        zoneId: telemetrySnapshots.zoneId,
        zoneName: telemetrySnapshots.zoneName,
        dCiScore: telemetrySnapshots.dCiScore,
        correctedPm25: telemetrySnapshots.correctedPm25,
        humidityRh: telemetrySnapshots.humidityRh,
        fiberLatencyMs: telemetrySnapshots.fiberLatencyMs,
        windShareMw: telemetrySnapshots.windShareMw,
        createdAt: telemetrySnapshots.createdAt,
      })
      .from(telemetrySnapshots)
      .innerJoin(users, eq(telemetrySnapshots.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(telemetrySnapshots.createdAt))
      .limit(15);

    return rows;
  } catch (error) {
    console.error('Database listUserTelemetrySnapshots failed:', error);
    throw new Error('Nie udało się pobrać zapisanych migawek telemetrii.', {cause: error});
  }
}

export async function saveAiSessionForUser(
  uid: string,
  email: string,
  payload: {
    sessionType: string;
    modelUsed: string;
    prompt: string;
    responseText: string;
    groundingLinksJson: string;
  },
) {
  try {
    const user = await getOrCreateUser(uid, email);
    const inserted = await db
      .insert(aiSessions)
      .values({
        userId: user.id,
        sessionType: payload.sessionType,
        modelUsed: payload.modelUsed,
        prompt: payload.prompt,
        responseText: payload.responseText,
        groundingLinksJson: payload.groundingLinksJson,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database saveAiSessionForUser failed:', error);
    throw new Error('Nie udało się zapisać sesji AI.', {cause: error});
  }
}

export async function listUserAiSessions(uid: string) {
  try {
    const rows = await db
      .select({
        id: aiSessions.id,
        sessionType: aiSessions.sessionType,
        modelUsed: aiSessions.modelUsed,
        prompt: aiSessions.prompt,
        responseText: aiSessions.responseText,
        groundingLinksJson: aiSessions.groundingLinksJson,
        createdAt: aiSessions.createdAt,
      })
      .from(aiSessions)
      .innerJoin(users, eq(aiSessions.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(aiSessions.createdAt))
      .limit(15);

    return rows;
  } catch (error) {
    console.error('Database listUserAiSessions failed:', error);
    throw new Error('Nie udało się pobrać historii sesji AI.', {cause: error});
  }
}
