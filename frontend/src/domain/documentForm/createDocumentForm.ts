/*
 * The document form host (kdd/custom-forms/specs.md § Forms in the UI;
 * implementation-plan H4, the edit path): given a document by name, or a new
 * one's registry entry and seed, it loads the document and the form library,
 * owns the draft, validates it against the entry's current schema, and saves
 * it through its category's mutation pinned to that schema. The screen that
 * mounts it (a record screen, a modal) renders the form body with the draft
 * and binds its own Save, Cancel and leave guard to what this returns.
 *
 * Every read here is non-suspending (api/gated): a host opened by an
 * interaction (the enrolment modal) sits under an already-open screen, which
 * must not suspend (kdd/solid-reactivity-pitfalls › No remounts on
 * interaction). The screen shows its own spinner while `status` is loading.
 *
 * TO-DO: when the document's pinned schema (`schema.id`) is not the entry's
 * current one, run the migration chain before seeding, and open archived forms
 * read-only (implementation-plan H4's versioning half, chunk 5).
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
import type { FormValidation } from '../../ui/layout/Form/formValidation';
import { createDraft, type Draft } from './draft';
import {
  FormDocumentByName,
  InsertFormEncounter,
  InsertFormProgramEnrolment,
  UpdateFormEncounter,
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
  /** The latest version of a saved document. */
  | { kind: 'existing'; name: string }
  /** A document not yet saved: its registry entry and first data. */
  | { kind: 'new'; registry: FormRegistryFragment; data: object };

export interface CreateDocumentFormOptions {
  storeId: Accessor<string>;
  /** The patient the document belongs to; every form category has one. */
  patientId: Accessor<string>;
  /** What to edit; undefined while there is nothing to (a closed modal). */
  source: Accessor<DocumentFormSource | undefined>;
  /** Summary names for the fields the screen renders itself (createDraft). */
  labels?: Accessor<Readonly<Record<string, string>>>;
}

export type DocumentFormStatus = 'idle' | 'loading' | 'ready' | 'not-found';

export interface DocumentForm<T> {
  status: Accessor<DocumentFormStatus>;
  /** The loaded form library, to render its fields and default forms from. */
  library: Accessor<FormLibrary | undefined>;
  draft: Draft<T>;
  /** The document's registry entry: its type, category and current schema. */
  registry: Accessor<FormRegistryFragment | undefined>;
  /** The latest saved version, or undefined for a document never saved. */
  document: Accessor<FormDocumentFragment | undefined>;
  isNew: Accessor<boolean>;
  isDirty: Accessor<boolean>;
  /** A new document may be saved as seeded; a saved one only once edited. */
  canSave: Accessor<boolean>;
  validation: FormValidation;
  saving: Accessor<boolean>;
  saveError: Accessor<string | undefined>;
  /**
   * Arms validation and, when the draft is valid, saves it. Resolves with the
   * saved version, or undefined when nothing was saved (invalid, refused, or a
   * failure the app's global error handling already reported).
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
 * its program events from the saved document. The schema id is always the
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
    pick: (data: R) => { id: string; document: FormDocumentFragment }
  ): SaveOutcome => {
    if (result.kind === 'success') {
      const node = pick(result.data);
      return { kind: 'saved', document: node.document, recordId: node.id };
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
    default:
      return {
        kind: 'refused',
        message: t('error.document-category-not-supported', {
          category: registry.category,
        }),
      };
  }
};

const sourceKey = (s: DocumentFormSource | undefined): string | undefined =>
  s === undefined
    ? undefined
    : s.kind === 'existing'
      ? `existing:${s.name}`
      : `new:${s.registry.id}`;

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
        ? { document: result.data.document }
        : undefined;
    }
  );

  // The version a save returned, for the source it was saved under: it
  // supersedes the loaded version (whose id is now a stale parent) until the
  // source changes.
  const [saved, setSaved] = createSignal<{
    key: string;
    document: FormDocumentFragment;
  }>();
  createEffect(() => {
    if (!options.source()) setSaved(undefined);
  });

  const document = createMemo((): FormDocumentFragment | undefined => {
    const key = sourceKey(options.source());
    const s = saved();
    if (s && s.key === key) return s.document;
    return gated(loaded)?.document ?? undefined;
  });

  const registry = createMemo((): FormRegistryFragment | undefined => {
    const doc = document();
    if (doc) return doc.documentRegistry ?? undefined;
    const s = options.source();
    return s?.kind === 'new' ? s.registry : undefined;
  });

  const status = createMemo((): DocumentFormStatus => {
    const s = options.source();
    if (!s) return 'idle';
    if (!gated(library)) return 'loading';
    if (s.kind === 'new') return 'ready';
    if (!document()) {
      const read = gated(loaded);
      return read === undefined ? 'loading' : 'not-found';
    }
    return registry() ? 'ready' : 'not-found';
  });

  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string>();

  const controller = createDraft<T>({
    schema: () => {
      const r = registry();
      return r
        ? { id: r.formSchemaId, jsonSchema: r.jsonSchema as JsonSchema }
        : undefined;
    },
    validate: () => gated(library)?.validateDocument,
    readOnly: saving,
    labels: options.labels,
  });

  // Seed the draft once per document version: on load, after each save (the
  // saved version is the new baseline), and afresh when the source changes.
  let seededKey: string | undefined;
  createEffect(() => {
    if (status() === 'idle') {
      seededKey = undefined;
      return;
    }
    if (status() !== 'ready') return;
    const s = options.source();
    const doc = document();
    const key = `${sourceKey(s)}|${doc?.id ?? 'unsaved'}`;
    if (key === seededKey) return;
    seededKey = key;
    const seed = doc ? doc.data : s?.kind === 'new' ? s.data : {};
    untrack(() => {
      setSaveError(undefined);
      controller.reset(seed as T);
    });
  });

  const isNew = () => options.source() !== undefined && !document();

  const save = async () => {
    if (saving()) return undefined;
    controller.validation.arm();
    const r = registry();
    if (!r || !controller.validation.valid()) return undefined;
    setSaving(true);
    setSaveError(undefined);
    const result = await persistDocument({
      storeId: options.storeId(),
      patientId: options.patientId(),
      registry: r,
      parent: document()?.id,
      data: controller.snapshot(),
    });
    setSaving(false);
    if (result.kind === 'refused') {
      setSaveError(result.message);
      return undefined;
    }
    if (result.kind === 'reported') return undefined;
    const key = sourceKey(options.source());
    if (key) setSaved({ key, document: result.document });
    return result.document;
  };

  const discard = () => {
    const s = options.source();
    const doc = document();
    const seed = doc ? doc.data : s?.kind === 'new' ? s.data : undefined;
    if (seed !== undefined) controller.reset(seed as T);
    setSaveError(undefined);
  };

  return {
    status,
    library: () => gated(library),
    draft: controller.draft,
    registry,
    document,
    isNew,
    isDirty: controller.isDirty,
    canSave: () => isNew() || controller.isDirty(),
    validation: controller.validation,
    saving,
    saveError,
    save,
    discard,
  };
};
