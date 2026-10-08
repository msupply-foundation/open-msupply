import { describe, expect, it } from 'vitest';
import {
  blankOldUiCandidates,
  canInstall,
  initialChoices,
  installVariables,
  needsChoices,
  previewOf,
  programOptions,
  refusedTypes,
  takeOverCandidates,
  unchosenKeys,
  withBlankOldUi,
  withProgram,
  withTakeOver,
  type DocumentTypePreview,
  type FormInstallPreview,
  type InstallChoices,
} from './formInstall';

// spec/plugin-management/cases/OMS-REG-MNG-07 — installing a bundle that
// carries a form plugin (.67–.72, .74): what the dialog asks, and what it
// sends, decided from the server's preview.

const HIV = { id: 'hiv_program', name: 'HIV Care' };
const TB = { id: 'tb_program', name: 'TB' };
const UNNAMED = { id: 'B910362B', name: '' };

const type = (
  documentType: string,
  programKey: string | null,
  rest: Partial<DocumentTypePreview> = {}
): DocumentTypePreview => ({
  documentType,
  name: `${documentType} name`,
  category: programKey ? 'ENCOUNTER' : 'PATIENT',
  programKey,
  existingEntry: 'NONE',
  existingEntryId: null,
  existingEntryOwner: null,
  existingEntryCategory: null,
  blanksOldUi: false,
  ...rest,
});

const preview = (
  overrides: Partial<FormInstallPreview['formPlugins'][number]> = {},
  programs = [HIV, TB]
): FormInstallPreview => ({
  programs,
  formPlugins: [
    {
      pluginCode: 'deployment',
      programKeys: [
        {
          programKey: 'hivCare',
          documentTypes: ['HIVEncounter'],
          boundProgram: null,
        },
        { programKey: 'tb', documentTypes: ['TBEncounter'], boundProgram: TB },
      ],
      documentTypes: [
        type('Patient', null),
        type('HIVEncounter', 'hivCare'),
        type('TBEncounter', 'tb'),
      ],
      ...overrides,
    },
  ],
});

const none: InstallChoices = { programs: {}, takeOver: [], blankOldUi: [] };

describe('OMS-REG-MNG-07.74 — a bundle with no form plugin asks nothing', () => {
  it('needs no choices when the preview lists no form plugin', () => {
    expect(needsChoices({ programs: [HIV], formPlugins: [] })).toBe(false);
    expect(needsChoices(preview())).toBe(true);
  });

  it('reads no preview from a file the server could not parse, or a failed read', () => {
    expect(
      previewOf({
        __typename: 'UploadedPluginError',
        error: 'CANNOT_PARSE_FILE',
      })
    ).toBeUndefined();
    expect(previewOf(undefined)).toBeUndefined();
    expect(
      previewOf({ __typename: 'PluginInfoNode', formInstallPreview: preview() })
    ).toEqual(preview());
  });
});

describe('OMS-REG-MNG-07.68 — a bound key starts on its current program', () => {
  it('pre-fills the keys an earlier install bound, and nothing else', () => {
    expect(initialChoices(preview())).toEqual({
      programs: { tb: 'tb_program' },
      takeOver: [],
      blankOldUi: [],
    });
  });

  it('sends the unchanged program with a re-install', () => {
    const choices = initialChoices(preview());
    expect(installVariables('file-1', choices)).toEqual({
      fileId: 'file-1',
      programs: [{ programKey: 'tb', programId: 'tb_program' }],
      takeOver: [],
      blankOldUi: [],
    });
  });
});

describe('OMS-REG-MNG-07.69 — Install plugin waits for every program key', () => {
  it('names the keys with no program', () => {
    const choices = initialChoices(preview());
    expect(unchosenKeys(preview(), choices).map(k => k.programKey)).toEqual([
      'hivCare',
    ]);
    expect(canInstall(preview(), choices)).toBe(false);
  });

  it('allows the install once each key has one', () => {
    const choices = withProgram(initialChoices(preview()), 'hivCare', HIV.id);
    expect(unchosenKeys(preview(), choices)).toEqual([]);
    expect(canInstall(preview(), choices)).toBe(true);
    expect(installVariables('file-1', choices).programs).toEqual([
      { programKey: 'tb', programId: 'tb_program' },
      { programKey: 'hivCare', programId: 'hiv_program' },
    ]);
  });
});

describe('OMS-REG-MNG-07.70 — an unowned entry needs its take-over confirmed', () => {
  const unowned = preview({
    documentTypes: [
      type('Patient', null, {
        existingEntry: 'UNOWNED',
        existingEntryId: 'C319',
      }),
      type('HIVEncounter', 'hivCare'),
      type('TBEncounter', 'tb'),
    ],
  });
  const programs = withProgram(initialChoices(unowned), 'hivCare', HIV.id);

  it('lists the type as a take-over and withholds the install until confirmed', () => {
    expect(takeOverCandidates(unowned).map(t => t.documentType)).toEqual([
      'Patient',
    ]);
    expect(canInstall(unowned, programs)).toBe(false);
    const confirmed = withTakeOver(programs, 'Patient', true);
    expect(canInstall(unowned, confirmed)).toBe(true);
    expect(installVariables('f', confirmed).takeOver).toEqual(['Patient']);
  });

  it('withdraws a confirmation, and confirms once however often it is ticked', () => {
    const twice = withTakeOver(
      withTakeOver(programs, 'Patient', true),
      'Patient',
      true
    );
    expect(twice.takeOver).toEqual(['Patient']);
    expect(withTakeOver(twice, 'Patient', false).takeOver).toEqual([]);
  });
});

describe('OMS-REG-MNG-07.71 — a blanked old-interface form needs acknowledging', () => {
  const blanking = preview({
    documentTypes: [
      type('Patient', null, {
        existingEntry: 'OWNED',
        blanksOldUi: true,
      }),
      type('HIVEncounter', 'hivCare'),
      type('TBEncounter', 'tb'),
    ],
  });
  const programs = withProgram(initialChoices(blanking), 'hivCare', HIV.id);

  it('lists the type and withholds the install until acknowledged', () => {
    expect(blankOldUiCandidates(blanking).map(t => t.documentType)).toEqual([
      'Patient',
    ]);
    expect(canInstall(blanking, programs)).toBe(false);
    const acknowledged = withBlankOldUi(programs, 'Patient', true);
    expect(canInstall(blanking, acknowledged)).toBe(true);
    expect(installVariables('f', acknowledged).blankOldUi).toEqual(['Patient']);
  });
});

describe("OMS-REG-MNG-07.72 — another plugin's type is refused up front", () => {
  it('names an owned type, an ambiguous one and one of another category, and withholds the install', () => {
    const owned = preview({
      documentTypes: [
        type('Patient', null, {
          existingEntry: 'CATEGORY_MISMATCH',
          existingEntryCategory: 'ENCOUNTER',
        }),
        type('HIVEncounter', 'hivCare', {
          existingEntry: 'OWNED_BY_ANOTHER_PLUGIN',
          existingEntryOwner: 'other_plugin',
        }),
        type('TBEncounter', 'tb', { existingEntry: 'AMBIGUOUS' }),
      ],
    });
    expect(refusedTypes(owned).map(t => t.documentType)).toEqual([
      'Patient',
      'HIVEncounter',
      'TBEncounter',
    ]);
    const complete = withProgram(initialChoices(owned), 'hivCare', HIV.id);
    expect(canInstall(owned, complete)).toBe(false);
  });
});

describe('OMS-REG-MNG-07.76 — the programs offered are the server’s, by name', () => {
  it('sorts by name and shows the id where the name is blank', () => {
    expect(programOptions([TB, UNNAMED, HIV])).toEqual([
      { value: 'B910362B', label: 'B910362B' },
      { value: 'hiv_program', label: 'HIV Care' },
      { value: 'tb_program', label: 'TB' },
    ]);
  });

  it('starts with no choices when the preview has no programs to offer', () => {
    const empty = preview({}, []);
    expect(programOptions(empty.programs)).toEqual([]);
    expect(canInstall(empty, none)).toBe(false);
  });
});
