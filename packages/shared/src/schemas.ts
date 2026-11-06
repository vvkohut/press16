import * as z from 'zod';

const meta = {
  id: z.string().min(1).max(100),
  updatedAt: z.number().int().nonnegative(),
  deleted: z.boolean(),
};

export const cycleSchema = z.object({
  ...meta,
  startDate: z.string().max(10),
  currentMax: z.number().positive(),
  targetMax: z.number().positive(),
  roundingStep: z.number().positive(),
  barWeight: z.number().nonnegative(),
  status: z.enum(['active', 'completed', 'abandoned']),
});

export const sessionLogSchema = z.object({
  ...meta,
  cycleId: z.string().min(1).max(100),
  week: z.number().int().min(1).max(17),
  workout: z.enum(['I', 'II', 'extra']),
  date: z.string().max(10).nullable(),
  status: z.enum(['planned', 'done', 'skipped']),
  notes: z.string().max(2000),
});

export const setLogSchema = z.object({
  ...meta,
  sessionId: z.string().min(1).max(100),
  index: z.number().int().nonnegative(),
  pct: z.number().positive(),
  plannedReps: z.number().int().nonnegative(),
  plannedWeight: z.number().nonnegative(),
  actualReps: z.number().int().nonnegative().nullable(),
  actualWeight: z.number().nonnegative().nullable(),
  done: z.boolean(),
});

export const syncRecordSchema = z.discriminatedUnion('entity', [
  z.object({ entity: z.literal('cycle'), data: cycleSchema }),
  z.object({ entity: z.literal('session'), data: sessionLogSchema }),
  z.object({ entity: z.literal('set'), data: setLogSchema }),
]);

export const syncRequestSchema = z.object({
  deviceId: z.string().min(1).max(100),
  cursor: z.number().int().nonnegative(),
  changes: z.array(syncRecordSchema).max(1000),
});
