// The sync driver op. manualSync is the path that takes the changelog ACCESS EXCLUSIVE lock on
// Postgres — the primary contention source we want to reproduce. Tagged `sync` so its errors
// (e.g. on a fresh-init / central-less datafile where sync isn't configured) don't dominate
// the workload error rate.
import { gqlRequest } from '../lib/graphql.js';
import { operations } from '../operations.generated.js';

export const manualSync = (ctx, fetchPatientId) =>
  gqlRequest(ctx, operations.manualSync, 'sync', { fetchPatientId: fetchPatientId || null });
