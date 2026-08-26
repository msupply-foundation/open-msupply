import { t, type LocaleKey } from '@/intl';
import type {
  SyncMessageFileFragment,
  SyncMessageRowFragment,
} from './syncMessages.generated';
import type { AuthorableType } from './syncMessageCreate';

/*
 * The register's display vocabulary (spec/sync-message/ui-surface.md S1 §
 * columns, S3): the message's own status and kind, and — a SECOND, independent
 * vocabulary — each attached file's transfer state. Two enums that share a
 * screen and must never be shown in the same column or row
 * (ui-surface § cross-cutting).
 *
 * Each mapping is a pure key function so the anchor-citing tests assert the
 * mapping itself, and a paired t() wrapper so the screens read a resolved name.
 * The keys are the ones ui-surface cites next to each label, verbatim.
 */

export type MessageStatus = SyncMessageRowFragment['status'];
export type MessageType = SyncMessageRowFragment['type'];
export type FileStatus = SyncMessageFileFragment['status'];

// The four message statuses (contract § lifecycle). Note the deliberately
// mixed key prefixes — they are the reference app's own call sites, not a
// pattern (ui-surface S1 § filters names all four).
const STATUS_KEYS: Record<MessageStatus, LocaleKey> = {
  new: 'label.new',
  inProgress: 'status.in-progress',
  processed: 'label.processed',
  error: 'status.error',
};

/**
 * Every message status the SCHEMA declares, in display order.
 *
 * A TypeScript union is erased at runtime, so the generated wire enum cannot
 * yield a runtime list on its own. `STATUS_KEYS` is the bridge: it is typed
 * `Record<MessageStatus, LocaleKey>`, so codegen adding a status breaks THIS
 * file until the new member is given a label — and every consumer that derives
 * its options from here (the register's Status filter) then picks it up
 * without being touched. No hand-maintained second list of statuses exists.
 *
 * Key order is insertion order for non-numeric string keys, so this is the
 * declaration order above — the order ui-surface S1 § filters lists.
 */
export const MESSAGE_STATUSES = Object.keys(STATUS_KEYS) as MessageStatus[];

// The three kinds the record carries (rules § kinds). `other` is a genuine
// catch-all — an unrecognised kind AND the record's internal merge kind both
// read as Other, and the register shows them without distinguishing which
// (contract ⚠️ wire trap — `other` collapses two record kinds).
const TYPE_KEYS: Record<MessageType, LocaleKey> = {
  supportUpload: 'label.support-upload',
  requestFieldChange: 'label.request-field-change',
  other: 'label.other',
};

// The attached file's own transfer state (rules § attached files).
const FILE_STATUS_KEYS: Record<FileStatus, LocaleKey> = {
  NEW: 'label.new',
  IN_PROGRESS: 'label.in-progress',
  DONE: 'label.done',
  ERROR: 'label.error',
  PERMANENT_FAILURE: 'label.permanent-failure',
};

/**
 * The locale key a status renders as — never the raw wire value
 * (OMS-REG-MNG-05.4). A value neither enum names falls back to the
 * not-applicable copy, so a schema that grows a member degrades to "N/A"
 * rather than leaking `inProgress` onto the screen.
 */
export const statusLabelKey = (status: string): LocaleKey =>
  STATUS_KEYS[status as MessageStatus] ?? 'messages.not-applicable';

export const typeLabelKey = (type: string): LocaleKey =>
  TYPE_KEYS[type as MessageType] ?? 'messages.not-applicable';

export const fileStatusLabelKey = (status: string): LocaleKey =>
  FILE_STATUS_KEYS[status as FileStatus] ?? 'messages.not-applicable';

export const statusLabel = (status: string): string =>
  t(statusLabelKey(status));
export const typeLabel = (type: string): string => t(typeLabelKey(type));
export const fileStatusLabel = (status: string): string =>
  t(fileStatusLabelKey(status));

/*
 * The AUTHORABLE kind vocabulary is a separate, narrower enum than the
 * record's (contract § kinds), so its one member is mapped onto the record
 * kind it creates and labelled from the same map the register's Type column
 * uses — the create modal and the register can never disagree about what
 * "Support upload" is called.
 */
const AUTHORABLE_RECORD_KINDS: Record<AuthorableType, MessageType> = {
  SUPPORT_UPLOAD: 'supportUpload',
};

export const authorableTypeLabel = (type: AuthorableType): string =>
  typeLabel(AUTHORABLE_RECORD_KINDS[type]);

/*
 * A file's transfer state as a status-badge colour token. Tokens are the
 * theme's business — this map only says which SEMANTIC token each state takes,
 * and the badge always carries its label as text, so colour is never the only
 * signal (ui-surface § cross-cutting). NEW/IN_PROGRESS reuse the shared
 * new/intermediate tokens; both failure states take the cancelled (error) one,
 * their labels telling them apart.
 */
const FILE_STATUS_COLOURS: Record<FileStatus, string> = {
  NEW: 'var(--status-new)',
  IN_PROGRESS: 'var(--status-allocated)',
  DONE: 'var(--status-finalised)',
  ERROR: 'var(--status-cancelled)',
  PERMANENT_FAILURE: 'var(--status-cancelled)',
};

export const fileStatusColour = (status: string): string =>
  FILE_STATUS_COLOURS[status as FileStatus] ?? 'var(--status-new)';
