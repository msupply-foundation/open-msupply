/*
 * The host's JSON Schema validator (kdd/custom-forms/specs.md § Data, storage
 * and validation): one AJV instance for every form, so every plugin gets the
 * same format validators and one error shape, and no plugin bundle ships a
 * validator of its own. Validators are compiled once per form-schema id; the
 * id is the content hash install wrote, so a cached validator can never be for
 * a different schema.
 *
 * AJV is the heaviest thing a form needs, so this module is reached only
 * through a dynamic import (loadValidation below) and lands in the form
 * library's lazy chunk; vite/lazyChunkGuard.ts fails the build if it ever
 * reaches the eager entry. The server validates every save regardless and
 * stays the guarantee; this exists so a user sees an error beside its field
 * before saving rather than one refusal after.
 */
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { t } from '../../intl';
import type { LocaleKey } from '../../intl/locales';
import { pointerToPath } from './paths';
import type { JsonSchema } from './schemaNode';

/** One schema violation, named by the dot path of the field it belongs to. */
export interface DocumentError {
  path: string;
  /** The AJV keyword that failed (`required`, `format`, `enum`, …). */
  keyword: string;
  message: string;
}

const ajv = new Ajv({
  allErrors: true,
  // Deployed legacy schemas carry keywords AJV's strict mode refuses (UI
  // hints, `$comment` in odd places); refusing them would refuse the form.
  strict: false,
  // Never register a schema's own `$id` in the instance: two schema versions
  // of one type can share an `$id`, and a registered one would make the second
  // compile throw. The cache below is keyed by form-schema id instead.
  addUsedSchema: false,
});
addFormats(ajv);

const cache = new Map<string, ValidateFunction>();
// The ids of schemas AJV could not compile, so each is tried and reported once.
const uncompilable = new Set<string>();

/*
 * Undefined for a schema AJV cannot compile. The server accepted it, so the
 * schema is the deployment's and not this form's to refuse; but validation
 * runs inside the draft's error memo, where a throw would take the screen
 * down, so the failure is caught and the draft is told it cannot be checked.
 */
const validatorFor = (
  schemaId: string,
  schema: JsonSchema
): ValidateFunction | undefined => {
  const cached = cache.get(schemaId);
  if (cached || uncompilable.has(schemaId)) return cached;
  try {
    const validate = ajv.compile(schema);
    cache.set(schemaId, validate);
    return validate;
  } catch (error) {
    uncompilable.add(schemaId);
    console.error(
      `[forms] schema ${schemaId} could not be compiled, so documents on it ` +
        `cannot be checked here: ${error instanceof Error ? error.message : String(error)}`
    );
    return undefined;
  }
};

const FORMAT_MESSAGES: Record<string, LocaleKey> = {
  'date-time': 'error.document-invalid-date-time',
  date: 'error.document-invalid-date',
};

const messageFor = (e: ErrorObject): string => {
  switch (e.keyword) {
    case 'required':
      return t('error.field-required');
    case 'format': {
      const key = FORMAT_MESSAGES[String(e.params['format'])];
      return key ? t(key) : t('error.document-invalid-value');
    }
    case 'enum':
      return t('error.document-invalid-option');
    case 'pattern':
      return t('error.document-invalid-format');
    case 'type':
      return e.params['type'] === 'number' || e.params['type'] === 'integer'
        ? t('error.document-invalid-number')
        : t('error.document-invalid-value');
    case 'minimum':
    case 'exclusiveMinimum':
      return t('error.document-number-min', { min: Number(e.params['limit']) });
    case 'maximum':
    case 'exclusiveMaximum':
      return t('error.document-number-max', { max: Number(e.params['limit']) });
    default:
      return t('error.document-invalid-value');
  }
};

/*
 * AJV names a missing property by its parent's pointer plus
 * `params.missingProperty`; every other keyword names the failing value's own
 * pointer. Both become the path of the field the user would fix.
 */
const pathFor = (e: ErrorObject): string => {
  const base = pointerToPath(e.instancePath);
  if (e.keyword === 'required') {
    const missing = String(e.params['missingProperty']);
    return base ? `${base}.${missing}` : missing;
  }
  return base;
};

/*
 * `anyOf`, `oneOf`, `if` and `not` add an error of their own on top of their
 * branches' errors, which would list one fault twice and blame the parent
 * object for a child's value. The branch errors are the specific ones.
 */
const COMPOSITION_KEYWORDS = new Set(['anyOf', 'oneOf', 'if', 'not']);

/** Validates `data` against `schema`; an empty list means it passes. */
export const validateDocument = (
  schemaId: string,
  schema: JsonSchema,
  data: unknown
): DocumentError[] => {
  const validate = validatorFor(schemaId, schema);
  // One error for the whole document: nothing on it can be checked, so it
  // cannot be saved from here either.
  if (!validate) {
    return [
      {
        path: '',
        keyword: 'schema',
        message: t('error.document-schema-unusable'),
      },
    ];
  }
  if (validate(data)) return [];
  const seen = new Set<string>();
  const errors: DocumentError[] = [];
  for (const e of validate.errors ?? []) {
    if (COMPOSITION_KEYWORDS.has(e.keyword)) continue;
    const path = pathFor(e);
    // One message per field: the first failure is the one to fix first.
    if (seen.has(path)) continue;
    seen.add(path);
    errors.push({ path, keyword: e.keyword, message: messageFor(e) });
  }
  return errors;
};

export type ValidateDocument = typeof validateDocument;
