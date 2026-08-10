import type { GraphqlResult } from '@/api/graphql';
import type {
  InsertSyncMessageResult,
  InsertSyncMessageVariables,
  SyncMessageStoresResult,
  SyncMessageStoresVariables,
} from './syncMessages.generated';

/*
 * Authoring a support upload (spec/sync-message/rules.md § creating a message;
 * ui-surface S2). Pure form logic, kept out of the modal so the anchor-citing
 * tests exercise it directly (OMS-REG-MNG-04 .9–.15).
 *
 * The author supplies a destination store, a kind, and which artefacts to
 * include; the SERVER fixes everything else — sender, created moment, status
 * New, no failure reason — so nothing below ever names those.
 */

/** One option of the destination picker (the `stores` read's node). */
export type StoreOption = SyncMessageStoresResult['stores']['nodes'][number];

/** The insert input exactly as GraphQL expects it (kdd/type-safety). */
export type InsertInput = InsertSyncMessageVariables['input'];

/** The authorable kind vocabulary — a separate, narrower enum than the
 *  record's own (contract § kinds): exactly one member today, so a later kind
 *  is a widening of the choice rather than a new surface. */
export type AuthorableType = InsertInput['type'];

export const AUTHORABLE_TYPES = [
  'SUPPORT_UPLOAD',
] as const satisfies readonly AuthorableType[];

export type SyncMessageForm = {
  /**
   * The picked destination store — the whole node, not a bare id: an async
   * picker has no local list to resolve an id against, so holding the object
   * is what keeps the field's label on screen after a pick.
   * Undefined = no destination, which is a valid message (rules § creating).
   */
  toStore?: StoreOption;
  type: AuthorableType;
  /** The receiving site's server logs. */
  logs: boolean;
  /** A point-in-time snapshot of the receiving site's database. */
  database: boolean;
};

/** A fresh create form: the only authorable kind preselected, both artefacts
 *  unticked, no destination (OMS-REG-MNG-04.9). */
export const EMPTY_FORM: SyncMessageForm = {
  type: 'SUPPORT_UPLOAD',
  logs: false,
  database: false,
};

/**
 * Whether the chosen kind takes artefacts at all. Support upload does; a kind
 * that takes none renders the checkboxes DISABLED rather than hidden, since
 * they are the kind's own fields (ui-surface S2 § artefacts). Only one kind is
 * authorable today, so the false branch is unreachable from the screen — it
 * exists so widening the kind choice is a one-line change here.
 */
export const kindTakesArtefacts = (type: AuthorableType): boolean =>
  type === 'SUPPORT_UPLOAD';

/**
 * The message body, DERIVED from the ticked artefacts and never author-typed
 * (rules § creating a message, OMS-REG-MNG-04.11). The receiving site reads it
 * as JSON and consults exactly two booleans; a missing or non-boolean member
 * counts as false, so both are always stated rather than omitted when
 * unticked — the recorded body then says what was asked for, not merely what
 * was ticked.
 *
 * A kind with no artefact choice carries an EMPTY body (rules § creating).
 */
export const buildBody = (form: SyncMessageForm): string =>
  kindTakesArtefacts(form.type)
    ? JSON.stringify({ logs: form.logs, database: form.database })
    : '';

/**
 * The create input. `id` is minted by the CLIENT (the already-exists rejection
 * is a client-collision guard, not something a user can trigger); the
 * destination is omitted entirely when none was picked — accepted and listed,
 * with no site ever acting on it (OMS-REG-MNG-04.13). Nothing excludes the
 * active store, so a message may be addressed to its own sender (.14).
 */
export const buildInsertInput = (
  form: SyncMessageForm,
  id: string
): InsertInput => ({
  id,
  ...(form.toStore ? { toStoreId: form.toStore.id } : {}),
  body: buildBody(form),
  type: form.type,
});

/**
 * The destination picker's server filter: every store the server holds,
 * searched on code-or-name, excluding nothing — so the active store is itself
 * offerable (OMS-REG-MNG-04.10/.14). An empty search sends no filter at all
 * rather than `{ like: '' }`, which the server would treat as a real
 * substring.
 */
export const storeSearchFilter = (
  search: string
): NonNullable<SyncMessageStoresVariables['filter']> =>
  search ? { codeOrName: { like: search } } : {};

/**
 * What a save attempt produced (OMS-REG-MNG-04.12/.15).
 *
 * `InsertSyncMessageResponse` is a SINGLE-MEMBER union — its only member is
 * `IdResponse`, and there is no error member at all — so both service
 * rejections (`SyncMessageAlreadyExists`, `ToStoreDoesNotExist`) arrive as
 * top-level GraphQL errors rather than a response branch (contract ⚠️ wire
 * trap). There is therefore nothing to discriminate inside a success, and
 * every non-success is a rejection that created nothing: the modal stays open
 * with the draft intact and states the failure inline.
 */
export const createOutcome = (
  result: GraphqlResult<InsertSyncMessageResult>
): 'created' | 'rejected' =>
  result.kind === 'success' ? 'created' : 'rejected';
