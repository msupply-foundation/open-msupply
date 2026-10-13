import {
  DocumentRegistryCategoryNode,
  ExistingRegistryEntryNode,
  RegistryOutcomeNode,
  UploadedPluginErrorVariant,
} from '@openmsupply-client/common';
import {
  blankOldUiCandidates,
  canInstall,
  formName,
  initialChoices,
  installReport,
  installVariables,
  needsChoices,
  NO_CHOICES,
  previewOf,
  programMoves,
  programOptions,
  refusedTypes,
  takeOverCandidates,
  typeRefusals,
  unchosenKeys,
  withBlankOldUis,
  blankOldUisAcknowledged,
  withProgram,
  withTakeOvers,
  takeOversConfirmed,
  DocumentTypePreview,
  FormInstallPreview,
} from './formInstall';

// spec/plugin-management/cases/OMS-REG-MNG-07 — installing a bundle that
// carries a form plugin (.67–.72, .74, .76–.80), as this client's modal
// decides it: what it asks, what it sends, and how it reads the install back.

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
  existingEntryProgram: null,
  blanksOldUi: false,
  refusals: [],
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

describe('the forms to take over are confirmed together, with one checkbox (.70)', () => {
  const unowned = preview({
    documentTypes: [
      type('Patient', null, {
        existingEntry: ExistingRegistryEntryNode.Unowned,
        existingEntryId: 'C319',
      }),
      type('HIVEncounter', 'hivCare', {
        existingEntry: ExistingRegistryEntryNode.Unowned,
        existingEntryId: 'dep_hiv',
      }),
      type('TBEncounter', 'tb'),
    ],
  });
  const programs = withProgram(initialChoices(unowned), 'hivCare', HIV.id);

  it('lists every such form and withholds the install until the one checkbox is ticked', () => {
    expect(takeOverCandidates(unowned).map(t => t.documentType)).toEqual([
      'Patient',
      'HIVEncounter',
    ]);
    expect(takeOversConfirmed(unowned, programs)).toBe(false);
    expect(canInstall(unowned, programs)).toBe(false);
    const confirmed = withTakeOvers(unowned, programs, true);
    expect(takeOversConfirmed(unowned, confirmed)).toBe(true);
    expect(canInstall(unowned, confirmed)).toBe(true);
    expect(installVariables('f', confirmed).takeOver).toEqual([
      'Patient',
      'HIVEncounter',
    ]);
    expect(withTakeOvers(unowned, confirmed, false).takeOver).toEqual([]);
  });

  it('counts as confirmed when there is nothing to take over', () => {
    expect(takeOversConfirmed(preview(), initialChoices(preview()))).toBe(true);
  });
});

describe('the forms the old interface would show empty are acknowledged together (.71)', () => {
  const blanking = preview({
    documentTypes: [
      type('Patient', null, {
        existingEntry: ExistingRegistryEntryNode.Owned,
        blanksOldUi: true,
      }),
      type('HIVEncounter', 'hivCare', {
        existingEntry: ExistingRegistryEntryNode.Owned,
        blanksOldUi: true,
      }),
      type('TBEncounter', 'tb'),
    ],
  });
  const programs = withProgram(initialChoices(blanking), 'hivCare', HIV.id);

  it('lists every such form and withholds the install until the one checkbox is ticked', () => {
    expect(blankOldUiCandidates(blanking).map(t => t.documentType)).toEqual([
      'Patient',
      'HIVEncounter',
    ]);
    expect(canInstall(blanking, programs)).toBe(false);
    const acknowledged = withBlankOldUis(blanking, programs, true);
    expect(blankOldUisAcknowledged(blanking, acknowledged)).toBe(true);
    expect(canInstall(blanking, acknowledged)).toBe(true);
    expect(installVariables('f', acknowledged).blankOldUi).toEqual([
      'Patient',
      'HIVEncounter',
    ]);
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

describe('a take-over starts its key on the program its forms are in (.78)', () => {
  // The deployment's own HIV entries, in HIV Care, about to be taken over by
  // a plugin whose hivCare key no earlier install bound.
  const deployed = preview({
    documentTypes: [
      type('Patient', null),
      type('HIVEncounter', 'hivCare', {
        existingEntry: ExistingRegistryEntryNode.Unowned,
        existingEntryId: 'dep_hiv',
        existingEntryProgram: HIV,
      }),
      type('TBEncounter', 'tb'),
    ],
  });

  it('pre-fills the key with that program, as it pre-fills a bound one', () => {
    expect(initialChoices(deployed).programs).toEqual({
      hivCare: HIV.id,
      tb: TB.id,
    });
  });

  it('warns, without withholding the install, when another program would move them', () => {
    const start = withTakeOvers(deployed, initialChoices(deployed), true);
    expect(programMoves(deployed, start, 'hivCare')).toEqual([]);
    const moved = withProgram(start, 'hivCare', TB.id);
    expect(programMoves(deployed, moved, 'hivCare')).toEqual([
      {
        from: HIV,
        forms: [expect.objectContaining({ documentType: 'HIVEncounter' })],
      },
    ]);
    expect(canInstall(deployed, moved)).toBe(true);
  });

  it('leaves the key empty when its forms sit in more than one program', () => {
    const split = preview({
      programKeys: [
        {
          __typename: 'FormPluginProgramKeyNode',
          programKey: 'hivCare',
          documentTypes: ['HIVEnrolment', 'HIVEncounter'],
          boundProgram: null,
        },
      ],
      documentTypes: [
        type('HIVEnrolment', 'hivCare', {
          existingEntry: ExistingRegistryEntryNode.Unowned,
          existingEntryProgram: HIV,
        }),
        type('HIVEncounter', 'hivCare', {
          existingEntry: ExistingRegistryEntryNode.Unowned,
          existingEntryProgram: TB,
        }),
      ],
    });
    expect(initialChoices(split).programs).toEqual({});
    // Whichever is chosen, the other program's form moves.
    expect(
      programMoves(
        split,
        withProgram(initialChoices(split), 'hivCare', HIV.id),
        'hivCare'
      ).map(move => move.from.id)
    ).toEqual([TB.id]);
  });
});

describe('a refusal no choice gets past is named up front (.79)', () => {
  it("lists the server's reasons and withholds the install whatever is chosen", () => {
    const reason =
      'Schema deployment_HIVEncounter_v1_aaaa is already installed with different content; a published schema version never changes, so the bundle must carry it exactly as installed';
    const refused = preview({
      documentTypes: [
        type('Patient', null),
        type('HIVEncounter', 'hivCare', { refusals: [reason] }),
        type('TBEncounter', 'tb'),
      ],
    });
    expect(typeRefusals(refused)).toEqual([
      {
        type: expect.objectContaining({ documentType: 'HIVEncounter' }),
        reason,
      },
    ]);
    const complete = withProgram(initialChoices(refused), 'hivCare', HIV.id);
    expect(unchosenKeys(refused, complete)).toEqual([]);
    expect(canInstall(refused, complete)).toBe(false);
  });
});

describe('the install says what it did to each form (.80)', () => {
  it('names each form by its display name, with its outcome, the program chosen for its key and counts', () => {
    expect(
      installReport(
        preview(),
        withProgram(initialChoices(preview()), 'hivCare', HIV.id),
        [
          {
            __typename: 'InstalledDocumentTypeNode',
            documentType: 'Patient',
            programKey: null,
            contextId: 'Patient',
            outcome: RegistryOutcomeNode.TakenOver,
            schemasAdded: 0,
            uiSchemasUpdated: 0,
          },
          {
            __typename: 'InstalledDocumentTypeNode',
            documentType: 'HIVEncounter',
            programKey: 'hivCare',
            contextId: HIV.id,
            outcome: RegistryOutcomeNode.Created,
            schemasAdded: 2,
            uiSchemasUpdated: 0,
          },
        ]
      )
    ).toEqual([
      {
        documentType: 'Patient',
        name: 'Patient name',
        outcome: RegistryOutcomeNode.TakenOver,
        program: undefined,
        schemasAdded: 0,
        uiSchemasUpdated: 0,
      },
      {
        documentType: 'HIVEncounter',
        name: 'HIVEncounter name',
        outcome: RegistryOutcomeNode.Created,
        program: 'HIV Care',
        schemasAdded: 2,
        uiSchemasUpdated: 0,
      },
    ]);
  });

  it('falls back to the document type for a form the preview does not name', () => {
    expect(formName(type('Bare', 'tb', { name: '' }))).toBe('Bare');
  });
});
