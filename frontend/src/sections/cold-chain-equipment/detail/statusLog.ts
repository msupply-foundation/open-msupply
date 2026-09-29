import type {
  AssetLogReasonsListResult,
  AssetLogRowFragment,
  InsertAssetLogVariables,
} from '../equipment.generated';
import type { AssetStatus } from '../equipment';

// The status-entry and temperature-mapping form logic (spec/cold-chain-
// equipment › rules § functional status / temperature mapping, ui-surface
// S5/S6). What makes an entry submittable, and the input that carries it.
// Framework-free so every guard — the required status, the reason that must
// match, the reason that demands observations, the future date — is testable in
// node vitest.

export type LogReason =
  AssetLogReasonsListResult['assetLogReasons']['nodes'][number];
export type AssetLogRow = AssetLogRowFragment;

/** The draft a freshly opened status modal starts from. */
export type StatusFormState = {
  status: AssetStatus | '';
  reasonId: string;
  comment: string;
  files: File[];
};

export const emptyStatusForm = (): StatusFormState => ({
  status: '',
  reasonId: '',
  comment: '',
  files: [],
});

/**
 * Whether a status entry may be submitted. Each clause mirrors a server guard,
 * because the UI mirrors server-enforced rules rather than assuming it is the
 * only guard (spec/IMPLEMENTING § behaviour):
 *
 * - A status MUST be chosen (OMS-REG-CCE-06.19); without one the server answers
 *   _no status_.
 * - **Not Functioning requires a reason** — a machine reported broken with no
 *   explanation tells the next person nothing (OMS-REG-CCE-06.22).
 * - A reason configured to require observations must have a non-blank note
 *   (OMS-REG-CCE-06.24).
 *
 * The reason-must-match guard is not here: the picker only ever offers the
 * chosen status's reasons, so a mismatched one is unreachable from the screen
 * ({@link reasonsForStatus}).
 */
export const canSubmitStatus = (
  form: StatusFormState,
  reasons: readonly LogReason[]
): boolean => {
  if (!form.status) return false;
  if (form.status === 'NOT_FUNCTIONING' && !form.reasonId) return false;
  const reason = reasons.find(candidate => candidate.id === form.reasonId);
  if (reason?.commentsRequired && !form.comment.trim()) return false;
  return true;
};

/**
 * The reasons offered for a status. Each configured reason belongs to exactly
 * one status, so a status with none configured offers none — and the reason
 * control is then inert rather than empty-and-clickable (OMS-REG-CCE-06.20).
 */
export const reasonsForStatus = (
  reasons: readonly LogReason[],
  status: AssetStatus | ''
): LogReason[] =>
  status ? reasons.filter(reason => reason.assetLogStatus === status) : [];

/**
 * Changing the status clears any reason already picked — a reason belongs to
 * one status, so one chosen under the old status can only be wrong under the
 * new one (OMS-REG-CCE-06.21).
 */
export const withStatus = (
  form: StatusFormState,
  status: AssetStatus | ''
): StatusFormState => ({ ...form, status, reasonId: '' });

/** Whether the chosen reason demands a non-blank note (OMS-REG-CCE-06.24). */
export const commentRequired = (
  form: StatusFormState,
  reasons: readonly LogReason[]
): boolean =>
  reasons.find(reason => reason.id === form.reasonId)?.commentsRequired ??
  false;

/**
 * The draft as an insert input. `type` is omitted — absent, the server defaults
 * it to a status update, which is what this form records. `logDatetime` is
 * omitted too: an entry recorded here is dated now, and the modal offers no
 * date control (ui-surface S5).
 */
export const buildStatusLogInput = (
  form: StatusFormState,
  assetId: string,
  id: string
): InsertAssetLogVariables['input'] => ({
  id,
  assetId,
  status: form.status || null,
  reasonId: form.reasonId || null,
  comment: form.comment.trim() || null,
});

/**
 * A temperature mapping: a dated observation, with no status and no reason
 * (rules › temperature mapping). Only a cold room or freezer room records one.
 *
 * The type MUST be sent — absent it the server defaults to a status update and
 * refuses the entry for having no status.
 */
export const buildMappingLogInput = (
  date: string,
  comment: string,
  assetId: string,
  id: string,
  now: Date = new Date()
): InsertAssetLogVariables['input'] => ({
  id,
  assetId,
  type: 'TEMPERATURE_MAPPING',
  comment: comment.trim() || null,
  logDatetime: date ? mappingInstant(date, now) : null,
});

/**
 * The instant a picked mapping DAY travels as.
 *
 * The server derives the asset's two mapping-date properties by formatting the
 * entry's stored **UTC** datetime as `YYYY-MM-DD` (contract › temperature
 * mapping). So the day the user picked survives only if the instant sent falls
 * on that UTC day — sending the day's first instant in the user's OWN zone
 * misdates the property by one day for every user east of UTC, which is what
 * the reference app does.
 *
 * Hence the picked day at 00:00 **UTC**, clamped to now so the server's
 * future-date guard can never refuse it (OMS-REG-CCE-06.25). The clamp bites only in the
 * hours between local midnight and 00:00Z on the same day — the one window the
 * server's date-from-an-instant derivation cannot represent at all.
 */
const mappingInstant = (date: string, now: Date): string => {
  const [year, month, day] = date.split('-').map(Number);
  const utcDay = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return new Date(Math.min(utcDay, now.getTime())).toISOString();
};

/**
 * Whether a mapping's date is submittable. An entry MAY be backdated but never
 * postdated — the server rejects a datetime in the future, so the picker caps
 * at today and this mirrors the cap (OMS-REG-CCE-06.25/.26).
 *
 * Compared as CALENDAR DAYS in the user's own zone, not as instants: the field
 * takes a day, not a moment (ui-standards/inputs § timezone authority). An
 * instant comparison would call today's date future for any user east of UTC,
 * because the day starts there before it starts in UTC.
 *
 * What travels is the day's first instant ({@link buildMappingLogInput}), which
 * is always in the past — so a date this accepts is never one the server
 * refuses.
 */
export const isMappingDateValid = (date: string, now: Date): boolean => {
  if (!date) return false;
  const picked = new Date(`${date}T00:00:00`);
  if (Number.isNaN(picked.getTime())) return false;
  return startOfLocalDay(picked) <= startOfLocalDay(now);
};

const startOfLocalDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** Which kinds the history filter offers, and what each narrows to. */
export type LogEventFilter = 'all' | 'status' | 'mapping';

/**
 * The history read's kind filter.
 *
 * There is no "has a status" predicate on the wire, so narrowing to status
 * entries enumerates all six statuses (contract › temperature mapping) —
 * `type: STATUS_UPDATE` would also match the historical rows that carry no
 * type at all.
 */
export const logKindFilter = (
  kind: LogEventFilter,
  statuses: readonly AssetStatus[]
): { status?: { equalAny: AssetStatus[] }; type?: { equalTo: 'TEMPERATURE_MAPPING' } } => {
  if (kind === 'status') return { status: { equalAny: [...statuses] } };
  if (kind === 'mapping') return { type: { equalTo: 'TEMPERATURE_MAPPING' } };
  return {};
};

/** Whether an entry is a temperature mapping rather than a status change. */
export const isMapping = (log: Pick<AssetLogRow, 'type'>): boolean =>
  log.type === 'TEMPERATURE_MAPPING';
