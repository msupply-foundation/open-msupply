import { createMemo, createSignal, onCleanup, type Accessor } from 'solid-js';
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
import type { UnresolvedValue } from './migration';
import { withoutEmptyNotes } from './notes';
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
  /**
   * Writes `value` at `path` as part of the document's starting state, so it
   * is not an edit: a form unchanged before stays unchanged. For a value the
   * form fills in itself as it opens, such as a new enrolment's generated ID
   * (spec/program-enrolment rules § leaving with unsaved changes).
   */
  fill<P extends Path<T>>(path: P, value: PathValue<T, P> | undefined): void;
  /**
   * Fails the field at `path` with `message`: a check the form makes itself,
   * beyond the schema's, such as an ID another record holds. `undefined`
   * clears it. A failing field shows its message at once and blocks the save,
   * as a schema error does; `label` names it in the error summary. Cleared
   * when the draft is seeded again.
   */
  setError(path: Path<T>, message: string | undefined, label?: string): void;
  /**
   * Work the form is doing that a save must wait for, such as a check still
   * running on what was just typed. A save waits for every such piece of
   * work to settle, then validates.
   */
  wait(work: Promise<unknown>): void;
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

/**
 * What the host's own fields read from a draft beyond `Draft`: the schema
 * rule a field's value fails, so a field can word that failure its own way (a
 * text field's example under a pattern failure). Not part of the SDK surface.
 */
export interface HostDraft<T> extends Draft<T> {
  /**
   * The rule the value at `path` fails: the AJV keyword (`pattern`, `format`,
   * `required` …), `unresolved` for a value a migration left, undefined for
   * none or a failure the caller found itself.
   */
  failedRule(path: Path<T>): string | undefined;
  /**
   * The paths of the errors on show beside their fields, in author order:
   * what a summary of several fields counts (a form category's tile).
   */
  visibleErrorPaths(): readonly string[];
  /**
   * Tells the draft how the field at `path` shows itself, so the error
   * summary names a failure there as the field beside it does: by its label,
   * in the user's language, with its example in a pattern failure's message.
   * A field calls it as it is created, through `nameFieldInSummary`; the
   * accessor follows a change of language, and the function returned forgets
   * the name when the field goes.
   */
  nameField(path: string, name: Accessor<FieldName | undefined>): () => void;
  /**
   * Whether a field on show has named `path`, or a path beneath it: the form
   * renders that part of the document itself, so a host surface that would
   * edit the same part (the encounter panel's Notes) stands down.
   */
  namesField(path: string): boolean;
}

/** How a field shows itself, for the error summary to name it the same way. */
export interface FieldName {
  /** The label the field shows, already translated. */
  label: string;
  /** A text field's example, which its pattern failure's message names. */
  example?: string;
}

/**
 * Names a field to its draft for the error summary (`HostDraft.nameField`),
 * until the field goes: a field component calls it with its own props as it
 * is created. Its label and example are read when the summary asks, so a
 * change of language follows; a field with no label of its own leaves the
 * summary to the screen's name or the path. A draft that takes no names (a
 * plugin test's stand-in) is left alone.
 */
export const nameFieldInSummary = (field: {
  draft: unknown;
  path: string;
  label?: string;
  example?: string;
}): void => {
  const name = (): FieldName | undefined =>
    field.label === undefined
      ? undefined
      : { label: field.label, example: field.example };
  const draft = field.draft as Partial<HostDraft<object>>;
  const forget = draft.nameField?.(field.path, name);
  if (forget) onCleanup(forget);
};

export interface DraftSchema {
  /** The form-schema id: the validator cache key and the save's schemaId. */
  id: string;
  jsonSchema: JsonSchema;
}

export interface DraftController<T> {
  draft: HostDraft<T>;
  /**
   * Replaces the document. `unresolved` carries the values a migration
   * cleared, by the path they were cleared from. `stored`, when given, is
   * what the dirty check compares against in place of the seed: a migrated
   * document's data as stored, so the form is pristine afterwards only when
   * the seed equals it. Without `stored`, the form is pristine.
   */
  reset: (
    seed: T,
    unresolved?: Record<string, UnresolvedValue>,
    stored?: unknown
  ) => void;
  /** A plain copy of the document, for the save. */
  snapshot: () => T;
  isDirty: Accessor<boolean>;
  /** True while work the form handed to `draft.wait` is still running. */
  busy: () => boolean;
  /** Settles once every piece of work handed to `draft.wait` has. */
  settled: () => Promise<void>;
  /** Validation timing and the error list (ui/layout/Form/formValidation). */
  validation: FormValidation;
}

export interface CreateDraftOptions {
  /** The registry entry's current schema: the document type's own. */
  schema: Accessor<DraftSchema | undefined>;
  /**
   * The category's base schema (baseSchemas/). The draft is validated against
   * it as well, and a field's facts fall back to it wherever the type's own
   * schema says nothing: a thin or legacy schema still gets the base fields'
   * formats, required marks and checks, which the server applies regardless.
   */
  baseSchema?: Accessor<DraftSchema | undefined>;
  /** The loaded validator; undefined until the lazy chunk has arrived. */
  validate: Accessor<ValidateDocument | undefined>;
  readOnly?: Accessor<boolean>;
  /**
   * False while the document is only being read as it was recorded (an
   * archived form, a version this app does not know): viewing never depends
   * on validity, so nothing is reported. True when absent.
   */
  validates?: Accessor<boolean>;
  /**
   * The error summary's names for fields the caller renders itself (a record
   * screen's toolbar), by path. A field the form renders names itself
   * (`nameFieldInSummary`), which wins; any other path is named by
   * pathLabel. An accessor, so translated names follow a change of language.
   */
  labels?: Accessor<Readonly<Record<string, string>>>;
  /**
   * Failures the caller finds itself, beyond the schema's (a duplicate
   * patient code), each with its own message. A field with a schema failure
   * shows that one.
   */
  extraErrors?: Accessor<readonly FieldError[]>;
}

/*
 * The field's own name, from its last path segment ("weightKg" → "Weight
 * kg"), for the error summary. Every field shows its real label beside its
 * own error; the summary also lists failures the form renders no field for
 * (a required property only the schema knows about), which have no label to
 * borrow. A field names itself through `nameFieldInSummary`, and a caller
 * the fields it renders itself through `labels`.
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
    Record<string, UnresolvedValue>
  >({});
  // The failures fields find themselves (draft.setError), by path.
  const [fieldErrors, setFieldErrors] = createSignal<
    Record<string, { message: string; label?: string }>
  >({});
  // Work a save waits for (draft.wait).
  const pending = new Set<Promise<unknown>>();
  // Bumped on every write. Validation and the dirty check read the whole
  // document through `unwrap`, which the store cannot track, so they depend on
  // this instead of on every property they happen to read.
  const [version, setVersion] = createSignal(0);

  const labelFor = (path: string) =>
    options.labels?.()[path] ?? pathLabel(path);

  // How each field on show names itself (draft.nameField), by path.
  const [names, setNames] = createSignal<
    Readonly<Record<string, Accessor<FieldName | undefined>>>
  >({});

  const checked = createMemo((): (FieldError & { rule?: string })[] => {
    version();
    if (options.validates?.() === false) return [];
    const validate = options.validate();
    const found: (FieldError & { rule?: string })[] = [];
    const schemas = [options.schema(), options.baseSchema?.()];
    for (const schema of schemas) {
      if (!schema || !validate) continue;
      for (const e of validate(schema.id, schema.jsonSchema, unwrap(store))) {
        // One message per field: the type's own schema speaks first.
        if (found.some(f => f.id === e.path)) continue;
        found.push({
          id: e.path,
          label: labelFor(e.path),
          failed: true,
          // A missing value carries no message of its own, so it waits for a
          // save attempt and then reads as the generic required message; a
          // wrong value shows the moment it is entered.
          message: e.keyword === 'required' ? undefined : e.message,
          rule: e.keyword,
        });
      }
    }
    for (const [path, old] of Object.entries(unresolvedValues())) {
      if (!isEmpty(getAt(unwrap(store), path))) continue;
      if (found.some(f => f.id === path)) continue;
      found.push({
        id: path,
        label: labelFor(path),
        failed: true,
        message: t('error.document-previously-recorded', {
          value: old.label?.() ?? displayValue(old.value),
        }),
        rule: 'unresolved',
      });
    }
    for (const [path, failure] of Object.entries(fieldErrors())) {
      if (found.some(f => f.id === path)) continue;
      found.push({
        id: path,
        label: failure.label ?? labelFor(path),
        failed: true,
        message: failure.message,
      });
    }
    for (const extra of options.extraErrors?.() ?? []) {
      if (!extra.failed || found.some(f => f.id === extra.id)) continue;
      found.push(extra);
    }
    return found;
  });

  // Every failure at a field on show takes the field's own name, so the
  // summary reads as the field does (a plugin's label, in the user's
  // language), and a pattern failure names the field's example as the field
  // does. Apart from the checks, so a field coming or going re-runs no
  // validation.
  const errors = createMemo((): (FieldError & { rule?: string })[] => {
    const shown = names();
    return checked().map(e => {
      const name = shown[e.id]?.();
      if (name === undefined) return e;
      const example =
        e.rule === 'pattern' && e.message !== undefined && name.example
          ? t('error.document-invalid-format-example', {
              example: name.example,
            })
          : undefined;
      return { ...e, label: name.label, message: example ?? e.message };
    });
  });

  const validation = createFormValidation(() => errors());

  // A note with no text is no change: the save leaves it out
  // (withoutEmptyNotes), so a note added and left empty is not something the
  // user must save or be asked to discard.
  const comparable = (data: unknown) => normalise(withoutEmptyNotes(data));
  const isDirty = createMemo(() => {
    version();
    return !deepEqual(comparable(unwrap(store)), comparable(seed()));
  });

  const draft: HostDraft<T> = {
    get data() {
      return store as T;
    },
    get: path => getAt(store, path) as never,
    set: (path, value) => {
      setStore(produce(s => setAt(s, path, value)));
      setVersion(v => v + 1);
    },
    fill: (path, value) => {
      setStore(produce(s => setAt(s, path, value)));
      // The same write on the seed the dirty check compares against.
      setSeed(previous => {
        const next = structuredClone(previous) as Record<string, unknown>;
        setAt(next, path, structuredClone(value));
        return next;
      });
      setVersion(v => v + 1);
    },
    schemaFor: path => {
      const schema = options.schema();
      const base = options.baseSchema?.();
      const own = schema ? fieldSchemaInfo(schema.jsonSchema, path) : undefined;
      const fallback = base
        ? fieldSchemaInfo(base.jsonSchema, path)
        : undefined;
      if (!own || !fallback) return own ?? fallback;
      return {
        required: own.required || fallback.required,
        format: own.format ?? fallback.format,
        enum: own.enum ?? fallback.enum,
        pattern: own.pattern ?? fallback.pattern,
      };
    },
    setError: (path, message, label) =>
      setFieldErrors(previous => {
        const next = { ...previous };
        if (message === undefined) delete next[path];
        else next[path] = { message, label };
        return next;
      }),
    wait: work => {
      pending.add(work);
      const done = () => pending.delete(work);
      work.then(done, done);
    },
    errorFor: path => validation.errorFor(path),
    failedRule: path => errors().find(e => e.id === path)?.rule,
    visibleErrorPaths: () => validation.visible().map(e => e.id),
    namesField: path => {
      const shown = names();
      return (
        path in shown || Object.keys(shown).some(k => k.startsWith(`${path}.`))
      );
    },
    nameField: (path, name) => {
      setNames(previous => ({ ...previous, [path]: name }));
      return () =>
        setNames(previous => {
          // A field mounted again at the path since has named it anew.
          if (previous[path] !== name) return previous;
          const next = { ...previous };
          delete next[path];
          return next;
        });
    },
    unresolved: path => unresolvedValues()[path]?.value,
    readOnly: () => options.readOnly?.() ?? false,
  };

  return {
    draft,
    reset: (next, unresolved = {}, stored = next) => {
      const copy = structuredClone(next) as Record<string, unknown>;
      setStore(reconcile(copy));
      setSeed(() => structuredClone(stored));
      setUnresolvedValues(unresolved);
      setFieldErrors({});
      setVersion(v => v + 1);
      // A document that already fails its schema opens with its errors on
      // show (the save alone is blocked); a clean one opens quiet.
      if (validation.valid()) validation.reset();
      else validation.arm();
    },
    snapshot: () => structuredClone(unwrap(store)) as T,
    isDirty,
    busy: () => pending.size > 0,
    settled: async () => {
      // Work added while waiting is waited for too.
      while (pending.size > 0) await Promise.allSettled([...pending]);
    },
    validation,
  };
};
