import type {
  SiteRowFragment,
  SiteStoreRowFragment,
  UpsertSiteResult,
  UpsertSiteVariables,
} from './sites.generated';

// Pure logic behind the site editor (spec/sites S2) — the form shape, the
// validation gate Save is disabled by, the upsert input (including the
// omit-to-leave-unchanged semantics), the client-proposed id, the store draft
// diff, and the rejection mapping. Free of solid-js and t() so node vitest
// covers it directly (spec/IMPLEMENTING.md C1/C2 — the behavioural leg without
// a CI backend runs at this logic level).

/** One register row — the generated node, never remapped (kdd/type-safety). */
export type SiteRow = SiteRowFragment;

/** One store, as both the assigned-store table and the picker see it. */
export type SiteStore = SiteStoreRowFragment;

/**
 * The editor's field state. Three strings, mirroring the three inputs.
 *
 * `password` is ALWAYS '' on open — the stored credential is unreadable, there
 * is no password field on `SiteNode` at all (OMS-FUN-SYC-002.21, contract.md
 * § password handling). The site's **id** is deliberately absent: it is never
 * shown and never editable (OMS-FUN-SYC-002.23).
 */
export type SiteFormState = {
  code: string;
  name: string;
  password: string;
};

/** A fresh create form. */
export const EMPTY_FORM: SiteFormState = { code: '', name: '', password: '' };

/**
 * Seed the edit form from the clicked row — code and name as stored, the
 * password box empty (OMS-FUN-SYC-002.21).
 */
export const formFromSite = (site: SiteRow): SiteFormState => ({
  code: site.code,
  name: site.name,
  password: '',
});

/** Entered but nothing but spaces — rejected, never treated as "unchanged". */
const whitespaceOnly = (value: string): boolean =>
  value !== '' && value.trim() === '';

/** Which surface the editor is: a create, or an existing site. */
export type EditorMode = 'create' | 'edit';

/**
 * The gate Save is disabled by (ui-surface S2: identity validation is expressed
 * by disabling Save, not by inline field errors).
 *
 * - Name is required in both modes (`UpsertSiteInput.name` is non-null).
 * - On CREATE code and password are required too (OMS-FUN-SYC-002.16).
 * - On EDIT an empty code or password box means "leave the stored value
 *   unchanged" and is valid (OMS-FUN-SYC-002.19), but a whitespace-only one is
 *   not — a user must not be able to blank either by typing spaces
 *   (OMS-FUN-SYC-002.20).
 */
export const isFormValid = (form: SiteFormState, mode: EditorMode): boolean => {
  if (form.name.trim() === '') return false;
  if (whitespaceOnly(form.code) || whitespaceOnly(form.password)) return false;
  if (mode === 'create')
    return form.code.trim() !== '' && form.password.trim() !== '';
  return true;
};

/**
 * The upsert input. `id` is required on create AND update — there is no insert
 * operation and no server-side allocation (contract.md § site identity).
 *
 * Code and password are OMITTED when blank rather than sent empty: the service
 * merges an absent optional from the existing row (`code.or(existing_code)`),
 * which is what makes "leave blank to keep" work (OMS-FUN-SYC-002.19), while an
 * empty string is the `CodeRequired` / `PasswordRequired` rejection. Values are
 * trimmed, so a trailing space never reaches validation or storage
 * (ui-surface S2).
 */
export const buildUpsertInput = (
  form: SiteFormState,
  id: number
): UpsertSiteVariables['input'] => {
  const code = form.code.trim();
  const password = form.password.trim();
  return {
    id,
    name: form.name.trim(),
    // undefined is dropped by JSON serialisation, so the field is absent on the
    // wire — which is what "unchanged" means here.
    code: code === '' ? undefined : code,
    password: password === '' ? undefined : password,
  };
};

/**
 * The id a create proposes: one more than the highest id among the sites
 * currently LOADED (rules.md § site identity).
 *
 * Captured as-is, not designed around: the list is server-paginated, so beyond
 * one page the highest loaded id is not the highest id — and because the write
 * is an upsert keyed on this id, a collision silently rewrites the site that
 * already held it, with no error of any kind (contract.md ⚠️ wire trap). The
 * spec records this deliberately; making it safe is a decision for review, not
 * one to award in the build.
 */
export const proposedSiteId = (rows: readonly { id: number }[]): number =>
  rows.reduce((highest, row) => Math.max(highest, row.id), 0) + 1;

/**
 * The two assignment calls a save needs (rules.md § store assignment):
 * `added` join this site, `removed` are handed back to the central server's
 * site — there is no unassigned state, so a removal is itself an assignment.
 * Both empty means no assignment call is made at all
 * (OMS-FUN-SYC-002.3 — an existing association is not disturbed by a field
 * edit).
 */
export type StoreDraftChange = { added: string[]; removed: string[] };

export const storeDraftChange = (
  original: readonly SiteStore[],
  draft: readonly SiteStore[]
): StoreDraftChange => {
  const originalIds = new Set(original.map(store => store.id));
  const draftIds = new Set(draft.map(store => store.id));
  return {
    added: draft.filter(store => !originalIds.has(store.id)).map(s => s.id),
    removed: original.filter(store => !draftIds.has(store.id)).map(s => s.id),
  };
};

/**
 * Where a removed store goes: the register's own root
 * (`syncSettings.centralServerSiteId`), falling back to 1 when the server has
 * no sync settings at all (contract.md § store assignment).
 */
export const reassignmentTarget = (
  centralServerSiteId: number | undefined
): number => centralServerSiteId ?? 1;

/**
 * OMS-FUN-SYC-002.34 — the central server's own site offers no store removal:
 * there is nowhere to give the stores back to. Mirrored in the UI as a disabled
 * affordance, and a removal there is dropped rather than submitted.
 */
export const storeRemovalAllowed = (
  siteId: number,
  centralServerSiteId: number | undefined
): boolean => siteId !== reassignmentTarget(centralServerSiteId);

/**
 * OMS-FUN-SYC-002.37 (editor half) — the editor's Delete is disabled while the
 * site still shows any store, mirroring the server's `SiteHasStores` refusal.
 */
export const siteDeletable = (assignedStoreCount: number): boolean =>
  assignedStoreCount === 0;

/**
 * A save rejection, for the editor's inline banner. Discriminated and
 * t()-free: the three "required" members name their field
 * (`error.field-must-be-specified`), everything else — the duplicate name
 * included, since the current app maps no message for it — falls through to
 * the generic `error.unable-to-save-site` (ui-surface S3).
 */
export type SaveRejection =
  | { kind: 'fieldRequired'; field: 'code' | 'name' | 'password' }
  | { kind: 'other'; description: string };

type UpsertError = Extract<
  UpsertSiteResult['centralServer']['site']['upsertSite'],
  { __typename: 'UpsertSiteError' }
>['error'];

export const upsertRejection = (error: UpsertError): SaveRejection => {
  switch (error.__typename) {
    case 'CodeRequired':
      return { kind: 'fieldRequired', field: 'code' };
    case 'NameRequired':
      return { kind: 'fieldRequired', field: 'name' };
    case 'PasswordRequired':
      return { kind: 'fieldRequired', field: 'password' };
    // UniqueValueViolation (a duplicate name, case-insensitively —
    // OMS-FUN-SYC-002.17): no mapped message, so the generic one.
    case 'UniqueValueViolation':
      return { kind: 'other', description: error.description };
  }
};
