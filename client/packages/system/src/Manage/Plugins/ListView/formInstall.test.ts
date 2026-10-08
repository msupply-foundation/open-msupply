import {
  DocumentRegistryCategoryNode,
  ExistingRegistryEntryNode,
  UploadedPluginErrorVariant,
} from '@openmsupply-client/common';
import {
  blankOldUiCandidates,
  canInstall,
  initialChoices,
  installVariables,
  needsChoices,
  NO_CHOICES,
  previewOf,
  programOptions,
  refusedTypes,
  takeOverCandidates,
  unchosenKeys,
  withBlankOldUi,
  withProgram,
  withTakeOver,
  DocumentTypePreview,
  FormInstallPreview,
} from './formInstall';

// spec/plugin-management/cases/OMS-REG-MNG-07 — installing a bundle that
// carries a form plugin (.67–.72, .74, .77), as this client's modal decides it.

const HIV = {
  __typename: 'ProgramNode' as const,
  id: 'hiv_program',
  name: 'HIV Care',
};
const TB = { __typename: 'ProgramNode' as const, id: 'tb_program', name: 'TB' };
const UNNAMED = {
  __typename: 'ProgramNode' as const,
  id: 'B910362B',
  name: '',
};

const type = (
  documentType: string,
  programKey: string | null,
  rest: Partial<DocumentTypePreview> = {}
): DocumentTypePreview => ({
  __typename: 'FormPluginDocumentTypeNode',
  documentType,
  name: `${documentType} name`,
  category: programKey
    ? DocumentRegistryCategoryNode.Encounter
    : DocumentRegistryCategoryNode.Patient,
  programKey,
  existingEntry: ExistingRegistryEntryNode.None,
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
  __typename: 'FormInstallPreviewNode',
  programs,
  formPlugins: [
    {
      __typename: 'FormPluginPreviewNode',
      pluginCode: 'deployment',
      programKeys: [
        {
          __typename: 'FormPluginProgramKeyNode',
          programKey: 'hivCare',
          documentTypes: ['HIVEncounter'],
          boundProgram: null,
        },
        {
          __typename: 'FormPluginProgramKeyNode',
          programKey: 'tb',
          documentTypes: ['TBEncounter'],
          boundProgram: TB,
        },
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

describe('a bundle with no form plugin asks nothing (.74)', () => {
  it('needs no choices when the preview lists no form plugin', () => {
    expect(
      needsChoices({
        __typename: 'FormInstallPreviewNode',
        programs: [HIV],
        formPlugins: [],
      })
    ).toBe(false);
    expect(needsChoices(preview())).toBe(true);
  });

  it('reads no preview from an unparseable file or a failed read', () => {
    expect(
      previewOf({
        __typename: 'UploadedPluginError',
        error: UploadedPluginErrorVariant.CannotParseFile,
      })
    ).toBeUndefined();
    expect(previewOf(undefined)).toBeUndefined();
    expect(
      previewOf({ __typename: 'PluginInfoNode', formInstallPreview: preview() })
    ).toEqual(preview());
  });
});

describe('a bound key starts on its current program (.68)', () => {
  it('pre-fills the keys an earlier install bound, and nothing else', () => {
    expect(initialChoices(preview())).toEqual({
      programs: { tb: 'tb_program' },
      takeOver: [],
      blankOldUi: [],
    });
  });

  it('sends the unchanged program with a re-install', () => {
    expect(installVariables('file-1', initialChoices(preview()))).toEqual({
      fileId: 'file-1',
      programs: [{ programKey: 'tb', programId: 'tb_program' }],
      takeOver: [],
      blankOldUi: [],
    });
  });
});

describe('Install plugin waits for every program key (.69)', () => {
  it('names the keys with no program, and allows the install once each has one', () => {
    const start = initialChoices(preview());
    expect(unchosenKeys(preview(), start).map(k => k.programKey)).toEqual([
      'hivCare',
    ]);
    expect(canInstall(preview(), start)).toBe(false);
    const chosen = withProgram(start, 'hivCare', HIV.id);
    expect(unchosenKeys(preview(), chosen)).toEqual([]);
    expect(canInstall(preview(), chosen)).toBe(true);
  });
});

describe('an unowned entry needs its take-over confirmed (.70)', () => {
  const unowned = preview({
    documentTypes: [
      type('Patient', null, {
        existingEntry: ExistingRegistryEntryNode.Unowned,
        existingEntryId: 'C319',
      }),
      type('HIVEncounter', 'hivCare'),
      type('TBEncounter', 'tb'),
    ],
  });
  const programs = withProgram(initialChoices(unowned), 'hivCare', HIV.id);

  it('lists the type and withholds the install until confirmed', () => {
    expect(takeOverCandidates(unowned).map(t => t.documentType)).toEqual([
      'Patient',
    ]);
    expect(canInstall(unowned, programs)).toBe(false);
    const confirmed = withTakeOver(programs, 'Patient', true);
    expect(canInstall(unowned, confirmed)).toBe(true);
    expect(installVariables('f', confirmed).takeOver).toEqual(['Patient']);
    expect(withTakeOver(confirmed, 'Patient', false).takeOver).toEqual([]);
  });
});

describe('a blanked old-interface form needs acknowledging (.71)', () => {
  const blanking = preview({
    documentTypes: [
      type('Patient', null, {
        existingEntry: ExistingRegistryEntryNode.Owned,
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

describe("another plugin's type, an ambiguous one, or one of another category is refused up front (.72)", () => {
  it('names all three and withholds the install whatever is chosen', () => {
    const refused = preview({
      documentTypes: [
        type('Patient', null, {
          existingEntry: ExistingRegistryEntryNode.CategoryMismatch,
          existingEntryCategory: DocumentRegistryCategoryNode.Encounter,
        }),
        type('HIVEncounter', 'hivCare', {
          existingEntry: ExistingRegistryEntryNode.OwnedByAnotherPlugin,
          existingEntryOwner: 'other_plugin',
        }),
        type('TBEncounter', 'tb', {
          existingEntry: ExistingRegistryEntryNode.Ambiguous,
        }),
      ],
    });
    expect(refusedTypes(refused).map(t => t.documentType)).toEqual([
      'Patient',
      'HIVEncounter',
      'TBEncounter',
    ]);
    expect(
      canInstall(
        refused,
        withProgram(initialChoices(refused), 'hivCare', HIV.id)
      )
    ).toBe(false);
  });
});

describe('the programs offered are the server’s, by name (.76, .77)', () => {
  it('sorts by name and shows the id where the name is blank', () => {
    expect(programOptions([TB, UNNAMED, HIV])).toEqual([
      { value: 'B910362B', label: 'B910362B' },
      { value: 'hiv_program', label: 'HIV Care' },
      { value: 'tb_program', label: 'TB' },
    ]);
  });

  it('can install nothing when the server has no programs', () => {
    const empty = preview({}, []);
    expect(programOptions(empty.programs)).toEqual([]);
    expect(canInstall(empty, NO_CHOICES)).toBe(false);
  });
});
