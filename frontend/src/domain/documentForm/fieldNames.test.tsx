import { createRoot, createSignal, Show } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setDictionaries, setLocale } from '../../intl/intl';
import { createDraft, type DraftController } from './draft';
import { validateDocument } from './validation';
import type { JsonSchema } from './schemaNode';

/*
 * OMS-REG-PLG-DJ-01.39 / OMS-REG-PLG-DJ-04.26: the error summary names a
 * plugin form's field as the field shows itself — by the label the form gave
 * it, in the user's language, and with its example in a format failure —
 * not by its path or the screen's own name for it. The host input is a
 * stand-in, so this runs without a DOM (vitest.workspace.ts, the solid
 * project).
 */

vi.mock('../../ui/elements/inputs/TextField', () => ({
  TextField: () => null,
}));
vi.mock('../../ui/elements/selectors/Combobox', () => ({
  Combobox: () => null,
}));
// The library's other inputs, which need a DOM to load.
vi.mock('../../ui/elements/inputs/TextArea', () => ({ TextArea: () => null }));
vi.mock('../../ui/elements/inputs/NumberField', () => ({
  NumberField: () => null,
}));
vi.mock('../../ui/elements/inputs/DateField', () => ({
  DateField: () => null,
}));
vi.mock('../../ui/elements/inputs/DateTimeField', () => ({
  DateTimeField: () => null,
}));
vi.mock('../../ui/elements/inputs/Checkbox', () => ({ Checkbox: () => null }));
vi.mock('../../ui/elements/selectors/Select', () => ({ Select: () => null }));
vi.mock('../../ui/layout/Form/FormSection', () => ({
  FormSection: () => null,
}));
vi.mock('../../ui/elements/display/Divider', () => ({ Divider: () => null }));
vi.mock('../patient/PatientControls', () => ({
  DateOfBirthControl: () => null,
}));

const { TextInput, AutocompleteInput } = await import('./fields');

interface Doc {
  code?: string;
  extension?: { nationality?: string };
}

const schema: JsonSchema = {
  type: 'object',
  properties: {
    code: { type: 'string', pattern: '^[0-9]{6}$' },
    extension: {
      type: 'object',
      properties: { nationality: { type: 'string' } },
      required: ['nationality'],
    },
  },
  required: ['extension'],
};

const draftFor = (): DraftController<Doc> =>
  createDraft<Doc>({
    schema: () => ({ id: 'field-names-v1', jsonSchema: schema }),
    validate: () => validateDocument,
    // The screen's own name for the code, as the patient screen gives one.
    labels: () => ({ code: 'Code' }),
  });

const summary = (c: DraftController<Doc>) => {
  c.validation.arm();
  return c.validation.visible().map(e => [e.id, e.label, e.message]);
};

describe('the error summary names a field as it shows itself', () => {
  afterEach(() => setDictionaries({}));

  it('by the label the form gave it, over the screen’s name', () => {
    setDictionaries({
      en: { 'error.document-invalid-format-example': 'Use: "{{example}}"' },
    });
    setLocale('en');
    createRoot(dispose => {
      const c = draftFor();
      c.reset({ code: 'GRY0001', extension: { nationality: 'Autres' } });
      <TextInput
        draft={c.draft}
        path="code"
        label="Identity number"
        example="112334"
      />;
      expect(summary(c)).toEqual([
        ['code', 'Identity number', 'Use: "112334"'],
      ]);
      dispose();
    });
  });

  it('in the language the label is shown in, following a change', () => {
    createRoot(dispose => {
      const c = draftFor();
      c.reset({ extension: {} });
      const [label, setLabel] = createSignal('Nationality');
      <AutocompleteInput
        draft={c.draft}
        path="extension.nationality"
        label={label()}
        options={[]}
      />;
      expect(summary(c)[0]?.[1]).toBe('Nationality');
      setLabel('Nationalité');
      expect(summary(c)[0]?.[1]).toBe('Nationalité');
      dispose();
    });
  });

  it('falls back to the screen’s name, then the path, once the field goes', () => {
    createRoot(dispose => {
      const c = draftFor();
      c.reset({ code: 'GRY0001', extension: {} });
      const [shown, setShown] = createSignal(true);
      <Show when={shown()}>
        <TextInput draft={c.draft} path="code" label="Identity number" />
        <AutocompleteInput
          draft={c.draft}
          path="extension.nationality"
          label="Nationalité"
          options={[]}
        />
      </Show>;
      expect(summary(c).map(([, name]) => name)).toEqual([
        'Identity number',
        'Nationalité',
      ]);
      setShown(false);
      expect(summary(c).map(([, name]) => name)).toEqual([
        'Code',
        'Nationality',
      ]);
      dispose();
    });
  });
});

describe('the host knows which parts of the document the form renders', () => {
  it('names a path while a field at it, or beneath it, is on show', () => {
    createRoot(dispose => {
      const c = draftFor();
      c.reset({ code: 'GRY0001', extension: {} });
      const [shown, setShown] = createSignal(true);
      <Show when={shown()}>
        <TextInput draft={c.draft} path="code" label="Identity number" />
        <AutocompleteInput
          draft={c.draft}
          path="extension.nationality"
          label="Nationalité"
          options={[]}
        />
      </Show>;
      expect(c.draft.namesField('code')).toBe(true);
      // A field beneath the path counts: the form renders that part.
      expect(c.draft.namesField('extension')).toBe(true);
      expect(c.draft.namesField('extension.nationality')).toBe(true);
      expect(c.draft.namesField('notes')).toBe(false);
      setShown(false);
      expect(c.draft.namesField('code')).toBe(false);
      expect(c.draft.namesField('extension')).toBe(false);
      dispose();
    });
  });
});
