import { createMemo, createSignal, type Accessor } from 'solid-js';
import { createStore, produce, reconcile, unwrap } from 'solid-js/store';
import { t } from '../../intl';
import {
  createFormValidation,
  type FieldError,
  type FormValidation,
} from '../../ui/layout/Form/formValidation';
import {
  deepEqual,
  getAt,
  normalise,
  setAt,
  type Path,
  type PathValue,
} from './paths';
import {
  fieldSchemaInfo,
  type FieldSchemaInfo,
  type JsonSchema,
} from './schemaNode';
import type { ValidateDocument } from './validation';

/**
 * A document being edited, as a form sees it (kdd/custom-forms/specs.md §
 * Forms in the UI). The document form host owns it and hands it to the form;
 * each field of the form library takes it with a path into `T`, so the field
 * reads and writes the draft, and asks it for the field's schema facts and
 * validation error, with no wiring of its own.
 */
export interface Draft<T> {
  /** The document as edited. Read it freely; write only through `set`. */
  readonly data: T;
  get<P extends Path<T>>(path: P): PathValue<T, P> | undefined;
  /** Writes `value` at `path`; `undefined` removes the property. */
  set<P extends Path<T>>(path: P, value: PathValue<T, P> | undefined): void;
  /** What the schema says about the field: required, format, enum. */
  schemaFor(path: Path<T>): FieldSchemaInfo | undefined;
  /** The message to show beside the field, when it has one to show. */
  errorFor(path: Path<T>): string | undefined;
  /**
   * A value recorded under an earlier schema that the current one would
   * reject, which migration cleared and recorded against its path. The field
   * shows it as "previously recorded" until the user chooses a current value.
   */
  unresolved(path: Path<T>): unknown;
  /** True while the document may only be read (an archived form, a save). */
  readOnly(): boolean;
}

export interface DraftSchema {
  /** The form-schema id: the validator cache key and the save's schemaId. */
  id: string;
  jsonSchema: JsonSchema;
}

export interface DraftController<T> {
  draft: Draft<T>;
  /**
   * Replaces the document, making the form pristine. `unresolved` carries
   * what a migration could not map (empty until migrations exist).
   */
  reset: (seed: T, unresolved?: Record<string, unknown>) => void;
  /** A plain copy of the document, for the save. */
  snapshot: () => T;
  isDirty: Accessor<boolean>;
  /** Validation timing and the error list (ui/layout/Form/formValidation). */
  validation: FormValidation;
}

export interface CreateDraftOptions {
  schema: Accessor<DraftSchema | undefined>;
  /** The loaded validator; undefined until the lazy chunk has arrived. */
  validate: Accessor<ValidateDocument | undefined>;
  readOnly?: Accessor<boolean>;
  /**
   * The error summary's names for fields the caller renders itself (a record
   * screen's toolbar), by path. Any other path is named by pathLabel. An
   * accessor, so translated names follow a change of language.
   */
  labels?: Accessor<Readonly<Record<string, string>>>;
}

/*
 * The field's own name, from its last path segment ("weightKg" → "Weight
 * kg"), for the error summary. Every field shows its real label beside its
 * own error; the summary also lists failures the form renders no field for
 * (a required property only the schema knows about), which have no label to
 * borrow. A caller names the fields it renders itself through `labels`.
 */
export const pathLabel = (path: string): string => {
  const leaf = path.split('.').pop() ?? path;
  const words = leaf.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const isEmpty = (v: unknown) => v === undefined || v === null || v === '';

const displayValue = (v: unknown): string =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
    ? String(v)
    : JSON.stringify(v);

/** Creates the draft store a document form host owns. */
export const createDraft = <T extends object>(
  options: CreateDraftOptions
): DraftController<T> => {
  const [store, setStore] = createStore<Record<string, unknown>>({});
  const [seed, setSeed] = createSignal<unknown>({});
  const [unresolvedValues, setUnresolvedValues] = createSignal<
    Record<string, unknown>
  >({});
  // Bumped on every write. Validation and the dirty check read the whole
  // document through `unwrap`, which the store cannot track, so they depend on
  // this instead of on every property they happen to read.
  const [version, setVersion] = createSignal(0);

  const labelFor = (path: string) =>
    options.labels?.()[path] ?? pathLabel(path);

  const errors = createMemo((): FieldError[] => {
    version();
    const schema = options.schema();
    const validate = options.validate();
    const found: FieldError[] = [];
    if (schema && validate) {
      for (const e of validate(schema.id, schema.jsonSchema, unwrap(store))) {
        found.push({
          id: e.path,
          label: labelFor(e.path),
          failed: true,
          // A missing value carries no message of its own, so it waits for a
          // save attempt and then reads as the generic required message; a
          // wrong value shows the moment it is entered.
          message: e.keyword === 'required' ? undefined : e.message,
        });
      }
    }
    for (const [path, value] of Object.entries(unresolvedValues())) {
      if (!isEmpty(getAt(unwrap(store), path))) continue;
      if (found.some(f => f.id === path)) continue;
      found.push({
        id: path,
        label: labelFor(path),
        failed: true,
        message: t('error.document-previously-recorded', {
          value: displayValue(value),
        }),
      });
    }
    return found;
  });

  const validation = createFormValidation(() => errors());

  const isDirty = createMemo(() => {
    version();
    return !deepEqual(normalise(unwrap(store)), normalise(seed()));
  });

  const draft: Draft<T> = {
    get data() {
      return store as T;
    },
    get: path => getAt(store, path) as never,
    set: (path, value) => {
      setStore(produce(s => setAt(s, path, value)));
      setVersion(v => v + 1);
    },
    schemaFor: path => {
      const schema = options.schema();
      return schema ? fieldSchemaInfo(schema.jsonSchema, path) : undefined;
    },
    errorFor: path => validation.errorFor(path),
    unresolved: path => unresolvedValues()[path],
    readOnly: () => options.readOnly?.() ?? false,
  };

  return {
    draft,
    reset: (next, unresolved = {}) => {
      const copy = structuredClone(next) as Record<string, unknown>;
      setStore(reconcile(copy));
      setSeed(() => structuredClone(next));
      setUnresolvedValues(unresolved);
      setVersion(v => v + 1);
      // A document that already fails its schema opens with its errors on
      // show (the save alone is blocked); a clean one opens quiet.
      if (validation.valid()) validation.reset();
      else validation.arm();
    },
    snapshot: () => structuredClone(unwrap(store)) as T,
    isDirty,
    validation,
  };
};
