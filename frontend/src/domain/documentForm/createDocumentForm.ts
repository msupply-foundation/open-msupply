/*
 * The document form host (kdd/custom-forms/specs.md § Forms in the UI; the edit
 * path): given a document by name, or a new one's registry entry and seed, it
 * loads the document and the form library, owns the draft, validates it against
 * the entry's current schema, and saves it through its category's mutation
 * pinned to that schema. The screen that mounts it (a record screen, a modal)
 * renders the form body with the draft and binds its own Save, Cancel and leave
 * guard to what this returns.
 *
 * Every read here is non-suspending (api/gated): a host opened by an
 * interaction (the enrolment modal) sits under an already-open screen, which
 * must not suspend (kdd/solid-reactivity-pitfalls › No remounts on
 * interaction). The screen shows its own spinner while `status` is loading.
 *
 * A document pinned to an earlier schema version than the entry's current one
 * (kdd/custom-forms/specs.md § Opening an older document) opens by the
 * versioning its plugin form declares: read-only in the archived form for its
 * version where there is one, until Edit; otherwise, and after Edit, in the
 * current form with its migrations run on the loaded data, the values they
 * clear held against their paths. A save re-pins it to the current version;
 * closing writes nothing. A version the plugin does not list opens read-only.
 */
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  untrack,
  type Accessor,
} from 'solid-js';
import {
  describeErrors,
  graphqlFetch,
  type GraphqlResult,
} from '../../api/graphql';
import { gated } from '../../api/gated';
import { t } from '../../intl';
import type {
  FieldError,
  FormValidation,
} from '../../ui/layout/Form/formValidation';
import {
  createSaveCoordinator,
  type SaveCoordinator,
} from '../../plugins/formParticipation';
import { createDraft, type Draft } from './draft';
import {
  applyMigrations,
  keptFields,
  type MigrationStep,
  type UnresolvedValue,
} from './migration';
import { withoutEmptyNotes } from './notes';
import { getAt } from './paths';
import {
  FormDocumentByName,
  InsertFormEncounter,
  InsertFormPatient,
  InsertFormProgramEnrolment,
  UpdateFormEncounter,
  UpdateFormPatient,
  UpdateFormProgramEnrolment,
  type FormDocumentFragment,
  type FormRegistryFragment,
} from './documentForm.generated';
import type { JsonSchema } from './schemaNode';

export type FormLibrary = typeof import('./formLibrary');

/** The form library's lazy chunk; the module system keeps the one copy. */
export const loadFormLibrary = (): Promise<FormLibrary> =>
  import('./formLibrary');

export type DocumentFormSource =
  /**
   * The latest version of a saved document. `seed`, when given, is what the
   * draft starts from in place of that version's data: a patient document
   * seeds from the server's `documentDraft`, which merges in later changes
   * to the patient's name row.
   */
  | { kind: 'existing'; name: string; seed?: object }
  /** A document not yet saved: its registry entry and first data. */
  | { kind: 'new'; registry: FormRegistryFragment; data: object };

/** A document type's versioning, as its plugin form declares it. */
export interface FormVersioning {
  /** Every schema id of the type, oldest first. */
  versions: readonly string[];
  migrations: readonly MigrationStep[];
  /** The version numbers that have an archived form. */
  archived: readonly number[];
}

/** How the opened document stands against the current schema version. */
export type DocumentVersion =
  /** Pinned to the current version, or with no versioning to go by. */
  | { kind: 'current' }
  /** Read-only in the archived form for its version, until Edit. */
  | { kind: 'archived'; version: number }
  /** In the current form, migrated from its version in memory. */
  | { kind: 'migrated'; version: number }
  /** Pinned to a version the plugin does not list: read-only. */
  | { kind: 'unknown' };

/** A value a migration kept, listed read-only under its author's label. */
export interface KeptValue {
  path: string;
  label: string;
  value: unknown;
}

const CURRENT: DocumentVersion = { kind: 'current' };

const sameVersion = (a: DocumentVersion, b: DocumentVersion): boolean =>
  a.kind === b.kind &&
  (a.kind === 'archived' || a.kind === 'migrated'
    ? a.version === (b as typeof a).version
    : true);

export interface CreateDocumentFormOptions {
  storeId: Accessor<string>;
  /** The patient the document belongs to; every form category has one. */
  patientId: Accessor<string>;
  /** What to edit; undefined while there is nothing to (a closed modal). */
  source: Accessor<DocumentFormSource | undefined>;
  /** Summary names for the fields the screen renders itself (createDraft). */
  labels?: Accessor<Readonly<Record<string, string>>>;
  /**
   * Failures only the screen can know (the patient screen's duplicate-code
   * check), shown and counted with the draft's own.
   */
  extraErrors?: Accessor<readonly FieldError[]>;
  /** True while the user may only read the document (no permission to save). */
  readOnly?: Accessor<boolean>;
  /**
   * The versioning of a document type's plugin form, or undefined where no
   * plugin form declares any. Read inside a memo, so it may read the plugin
   * registry reactively.
   */
  versioning?: (documentType: string) => FormVersioning | undefined;
}

export type DocumentFormStatus = 'idle' | 'loading' | 'ready' | 'not-found';

export interface DocumentForm<T> {
  /**
   * 'ready' once the document and form library have loaded and the draft is
   * seeded from them, so a form mounted on 'ready' reads the document's data
   * from its first render.
   */
  status: Accessor<DocumentFormStatus>;
  /** The loaded form library, to render its fields and default forms from. */
  library: Accessor<FormLibrary | undefined>;
  /**
   * True when the form library's code failed to load (offline): `status`
   * stays loading, and the screen says so rather than spinning.
   */
  libraryFailed: Accessor<boolean>;
  draft: Draft<T>;
  /**
   * The form's own part in the save (FormParticipation), for the plugin form
   * to take through its slot: a form's dirty state and validity count with
   * the draft's, its before-save handlers run before the document is
   * persisted (a throw stops the save and shows its message), and its
   * after-save handlers once it is.
   */
  coordinator: SaveCoordinator;
  /** The document's registry entry: its type, category and current schema. */
  registry: Accessor<FormRegistryFragment | undefined>;
  /** The latest saved version, or undefined for a document never saved. */
  document: Accessor<FormDocumentFragment | undefined>;
  isNew: Accessor<boolean>;
  isDirty: Accessor<boolean>;
  /** A new document may be saved as seeded; a saved one only once edited. */
  canSave: Accessor<boolean>;
  validation: FormValidation;
  /** The document's schema version against the current one. */
  version: Accessor<DocumentVersion>;
  /** Leaves an archived form for the current one, migrating the document. */
  edit: () => void;
  /** Values the type's migrations keep that the document holds. */
  kept: Accessor<readonly KeptValue[]>;
  saving: Accessor<boolean>;
  saveError: Accessor<string | undefined>;
  /**
   * Arms validation and, when the draft is valid, saves it. Resolves with the
   * saved version, or undefined when nothing was saved (not yet ready,
   * invalid, refused, or a failure the app's global error handling already
   * reported).
   */
  save: () => Promise<FormDocumentFragment | undefined>;
  /** Drops the edits, back to the last saved version or the new seed. */
  discard: () => void;
}

export type SaveOutcome =
  | {
      kind: 'saved';
      document: FormDocumentFragment;
      /**
       * The category's own row id (the enrolment's, the encounter's): stable
       * across versions, since the server derives it from the document name.
       */
      recordId: string;
    }
  | { kind: 'refused'; message: string }
  /** Reported by the app's global handling (a lost session, an outage). */
  | { kind: 'reported' };

export interface SaveInput {
  storeId: string;
  patientId: string;
  registry: FormRegistryFragment;
  /** The latest version's document id; absent for the first save. */
  parent: string | undefined;
  data: unknown;
}

/*
 * The category's own mutation: each has an insert and an update, and the
 * server derives the category's flat row (program_enrolment, encounter) and
 * its program events from the saved document, or, for a patient, projects
 * its base fields onto the patient's name row. The schema id is always the
 * entry's current one, so an edit re-pins the document to it. Exported for
 * a create step that writes a document before any form opens (the
 * create-encounter dialog).
 */
export const persistDocument = async (
  input: SaveInput
): Promise<SaveOutcome> => {
  const { storeId, patientId, registry, parent, data } = input;
  const type = registry.documentType;
  const schemaId = registry.formSchemaId;
  const options = { returnGraphqlErrors: true };
  const outcome = <R>(
    result: GraphqlResult<R>,
    pick: (data: R) => {
      id: string;
      document: FormDocumentFragment | null | undefined;
    }
  ): SaveOutcome => {
    if (result.kind === 'success') {
      const node = pick(result.data);
      // Every category's save returns the version it wrote; a patient's
      // types it as nullable because a patient need not have a document.
      return node.document
        ? { kind: 'saved', document: node.document, recordId: node.id }
        : { kind: 'reported' };
    }
    if (result.kind === 'graphqlError') {
      return { kind: 'refused', message: describeErrors(result.errors) };
    }
    return { kind: 'reported' };
  };

  switch (registry.category) {
    case 'PROGRAM_ENROLMENT':
      return parent
        ? outcome(
            await graphqlFetch(
              UpdateFormProgramEnrolment,
              { storeId, input: { type, patientId, data, schemaId, parent } },
              options
            ),
            r => r.updateProgramEnrolment
          )
        : outcome(
            await graphqlFetch(
              InsertFormProgramEnrolment,
              { storeId, input: { type, patientId, data, schemaId } },
              options
            ),
            r => r.insertProgramEnrolment
          );
    case 'ENCOUNTER':
      return parent
        ? outcome(
            await graphqlFetch(
              UpdateFormEncounter,
              { storeId, input: { type, data, schemaId, parent } },
              options
            ),
            r => r.updateEncounter
          )
        : outcome(
            await graphqlFetch(
              InsertFormEncounter,
              { storeId, input: { type, patientId, data, schemaId } },
              options
            ),
            r => r.insertEncounter
          );
    case 'PATIENT':
      return parent
        ? outcome(
            await graphqlFetch(
              UpdateFormPatient,
              { storeId, input: { data, schemaId, parent } },
              options
            ),
            r => r.updateProgramPatient
          )
        : outcome(
            await graphqlFetch(
              InsertFormPatient,
              { storeId, input: { data, schemaId } },
              options
            ),
            r => r.insertProgramPatient
          );
    default:
      return {
        kind: 'refused',
        message: t('error.document-category-not-supported', {
          category: registry.category,
        }),
      };
  }
};

// A new source is keyed by its patient as well as its type: two patients'
// new documents of one type are different documents.
const sourceKey = (
  s: DocumentFormSource | undefined,
  patientId: string
): string | undefined =>
  s === undefined
    ? undefined
    : s.kind === 'existing'
      ? `existing:${s.name}`
      : `new:${patientId}:${s.registry.id}`;

export const createDocumentForm = <T extends object>(
  options: CreateDocumentFormOptions
): DocumentForm<T> => {
  const [library] = createResource(
    () => (options.source() ? true : undefined),
    () => loadFormLibrary()
  );

  const [loaded] = createResource(
    () => {
      const s = options.source();
      return s?.kind === 'existing'
        ? { storeId: options.storeId(), name: s.name }
        : undefined;
    },
    async ({ storeId, name }) => {
      const result = await graphqlFetch(FormDocumentByName, { storeId, name });
      // A failed read was reported globally; `null` is a document that does
      // not exist or that the user may not read. Wrapped, so the two differ.
      return result.kind === 'success'
        ? { storeId, name, document: result.data.document }
        : undefined;
    }
  );

  // The read for the source as it stands. The resource keeps its last value
  // while it refetches for another name, and when the source stops naming one
  // (a new document), and that value is another document's: seeded or saved
  // into, it would show and update the wrong record.
  const read = () => {
    const value = gated(loaded);
    const s = options.source();
    return value &&
      s?.kind === 'existing' &&
      value.name === s.name &&
      value.storeId === options.storeId()
      ? value
      : undefined;
  };

  const currentKey = () => sourceKey(options.source(), options.patientId());

  // The version a save returned, for the source it was saved under: it
  // supersedes the loaded version (whose id is now a stale parent) until the
  // source changes.
  const [saved, setSaved] = createSignal<{
    key: string;
    document: FormDocumentFragment;
  }>();

  // A first save turns a new source into an existing one under the saved
  // name (the patient screen re-reads its patient); the saved version still
  // stands for it, so the form does not drop to loading and back.
  const standsForSource = (s: {
    key: string;
    document: FormDocumentFragment;
  }): boolean => {
    const source = options.source();
    return (
      s.key === currentKey() ||
      (source?.kind === 'existing' && source.name === s.document.name)
    );
  };
  // Any other source drops it, so coming back to the record reads it afresh.
  createEffect(() => {
    const s = saved();
    if (s && !standsForSource(s)) setSaved(undefined);
  });

  const document = createMemo((): FormDocumentFragment | undefined => {
    const s = saved();
    if (s && standsForSource(s)) return s.document;
    return read()?.document ?? undefined;
  });

  const registry = createMemo((): FormRegistryFragment | undefined => {
    const doc = document();
    if (doc) return doc.documentRegistry ?? undefined;
    const s = options.source();
    return s?.kind === 'new' ? s.registry : undefined;
  });

  // How far the source's inputs have arrived. `status` holds 'ready' back
  // until the draft is seeded from them.
  const loadStatus = createMemo((): DocumentFormStatus => {
    const s = options.source();
    if (!s) return 'idle';
    if (!gated(library)) return 'loading';
    if (s.kind === 'new') return 'ready';
    if (!document()) return read() === undefined ? 'loading' : 'not-found';
    return registry() ? 'ready' : 'not-found';
  });

  const versioning = createMemo(() => {
    const r = registry();
    return r ? options.versioning?.(r.documentType) : undefined;
  });

  // The saved version the user pressed Edit on, leaving its archived form.
  const [editing, setEditing] = createSignal<string>();

  const version = createMemo(
    (): DocumentVersion => {
      const doc = document();
      const r = registry();
      const v = versioning();
      const pinned = doc?.schema?.id;
      if (!doc || !r || !v || !pinned || pinned === r.formSchemaId) {
        return CURRENT;
      }
      const at = v.versions.indexOf(pinned) + 1;
      const current = v.versions.indexOf(r.formSchemaId) + 1;
      if (at === 0 || current === 0 || at > current) return { kind: 'unknown' };
      if (v.archived.includes(at) && editing() !== doc.id) {
        return { kind: 'archived', version: at };
      }
      return { kind: 'migrated', version: at };
    },
    CURRENT,
    { equals: sameVersion }
  );

  // Read as it was recorded: against its own schema, with nothing to fix.
  const readingOnly = () =>
    version().kind === 'archived' || version().kind === 'unknown';

  /** The draft's starting point for the document as it stands. */
  const seedFor = ():
    | { data: object; unresolved: Record<string, UnresolvedValue> }
    | undefined => {
    const s = options.source();
    const doc = document();
    // A source's seed stands for the version it was read with; a version
    // this form has just saved is its own seed.
    const seed =
      s?.kind === 'existing' && doc !== saved()?.document ? s.seed : undefined;
    const raw = doc
      ? (seed ?? doc.data)
      : s?.kind === 'new'
        ? s.data
        : undefined;
    if (raw === undefined) return undefined;
    const v = version();
    const r = registry();
    const steps = versioning();
    if (v.kind === 'migrated' && r && steps) {
      const migrated = applyMigrations(
        raw,
        v.version,
        steps.versions.indexOf(r.formSchemaId) + 1,
        steps.migrations
      );
      if (migrated) return migrated;
    }
    return { data: raw as object, unresolved: {} };
  };

  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string>();

  const controller = createDraft<T>({
    schema: () => {
      const r = registry();
      const pinned = document()?.schema;
      if (readingOnly() && pinned) {
        return { id: pinned.id, jsonSchema: pinned.jsonSchema as JsonSchema };
      }
      return r
        ? { id: r.formSchemaId, jsonSchema: r.jsonSchema as JsonSchema }
        : undefined;
    },
    baseSchema: () => {
      const r = registry();
      return r ? gated(library)?.baseSchemaFor(r.category) : undefined;
    },
    validate: () => gated(library)?.validateDocument,
    readOnly: () =>
      saving() || readingOnly() || (options.readOnly?.() ?? false),
    validates: () => !readingOnly(),
    labels: options.labels,
    extraErrors: options.extraErrors,
  });

  // The source the draft was last seeded for.
  const [seededFor, setSeededFor] = createSignal<string>();

  // Seed the draft once per document version: on load, after each save (the
  // saved version is the new baseline), afresh when the source changes, and
  // when Edit leaves an archived form for the migrated current one.
  let seededKey: string | undefined;
  createEffect(() => {
    if (loadStatus() === 'idle') {
      seededKey = undefined;
      setSeededFor(undefined);
      return;
    }
    if (loadStatus() !== 'ready') return;
    const doc = document();
    const key = `${currentKey()}|${doc?.id ?? 'unsaved'}|${version().kind}`;
    if (key === seededKey) return;
    seededKey = key;
    untrack(() => {
      const seed = seedFor() ?? { data: {}, unresolved: {} };
      setSaveError(undefined);
      controller.reset(seed.data as T, seed.unresolved);
      setSeededFor(currentKey());
    });
  });

  // Whether the draft holds the source's data. A screen mounts its form body
  // on 'ready', in the same update that loads the inputs and before the
  // seeding effect runs, so a form reading the draft as it mounts would read
  // it empty. Once seeded, the source stays seeded across its own re-seeds
  // (a save, Edit), including a first save turning a new source into the
  // saved one: dropping to loading there would remount a live form.
  const seeded = (): boolean => {
    const at = seededFor();
    if (at === undefined) return false;
    if (at === currentKey()) return true;
    const s = saved();
    return s !== undefined && s.key === at && standsForSource(s);
  };

  const status = createMemo((): DocumentFormStatus => {
    const loading = loadStatus();
    return loading === 'ready' && !seeded() ? 'loading' : loading;
  });

  const isNew = () => options.source() !== undefined && !document();

  const kept = createMemo((): readonly KeptValue[] => {
    const steps = versioning();
    if (!steps || version().kind === 'archived') return [];
    const data = controller.draft.data;
    return keptFields(steps.migrations).flatMap(field => {
      const value = getAt(data, field.path);
      return value === undefined || value === null || value === ''
        ? []
        : [{ path: field.path, label: field.label(), value }];
    });
  });

  const edit = () => {
    if (version().kind === 'archived') setEditing(document()?.id);
  };

  const coordinator = createSaveCoordinator();
  const isDirty = () => controller.isDirty() || coordinator.dirty();

  const save = async () => {
    if (status() !== 'ready' || saving() || readingOnly()) return undefined;
    controller.validation.arm();
    const r = registry();
    if (!r || !controller.validation.valid()) return undefined;
    const invalid = coordinator.invalidMessage();
    if (invalid !== undefined) {
      setSaveError(invalid);
      return undefined;
    }
    // The source the save was made from: by the time it returns the screen
    // may show another record, which this version must not stand for.
    const key = currentKey();
    setSaving(true);
    setSaveError(undefined);
    // Before the snapshot, so a handler's own writes to the draft are saved.
    const veto = await coordinator.runBeforeSave();
    if (veto.kind === 'vetoed') {
      setSaving(false);
      if (key === currentKey()) setSaveError(veto.message);
      return undefined;
    }
    const result = await persistDocument({
      storeId: options.storeId(),
      patientId: options.patientId(),
      registry: r,
      parent: document()?.id,
      // A note left with no text stays in the list while the form is open.
      data: withoutEmptyNotes(controller.snapshot()),
    });
    setSaving(false);
    if (result.kind === 'refused') {
      if (key === currentKey()) setSaveError(result.message);
      return undefined;
    }
    if (result.kind === 'reported') return undefined;
    if (key) setSaved({ key, document: result.document });
    // Saved means clean, whatever a form's controls declared: one that has
    // left the form since cannot clear its own.
    if (key === currentKey()) coordinator.clearDirty();
    const after = await coordinator.runAfterSave({ recordId: result.recordId });
    // The document is saved either way; what a handler failed to do is shown.
    if (after.kind === 'failed' && key === currentKey()) {
      setSaveError(after.message);
    }
    return result.document;
  };

  const discard = () => {
    const seed = seedFor();
    if (seed) controller.reset(seed.data as T, seed.unresolved);
    setSaveError(undefined);
  };

  return {
    status,
    library: () => gated(library),
    libraryFailed: () => library.state === 'errored',
    draft: controller.draft,
    coordinator,
    registry,
    document,
    isNew,
    isDirty,
    // A migrated document may be saved untouched: the save re-pins it.
    canSave: () =>
      status() === 'ready' &&
      !readingOnly() &&
      (isNew() || isDirty() || version().kind === 'migrated'),
    validation: controller.validation,
    version,
    edit,
    kept,
    saving,
    saveError,
    save,
    discard,
  };
};
