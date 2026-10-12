import type {
  InstallUploadedPluginResult,
  InstallUploadedPluginVariables,
  UploadedPluginInfoResult,
} from './plugins.generated';

/*
 * A form plugin's installer choices (spec/plugin-management/rules.md ›
 * installing a bundle § a bundle carrying form plugins; contract.md ›
 * preview, › install). The server reads the uploaded bundle against its own
 * registry and says what an install needs chosen: a program for each program
 * key, a confirmation for each registry entry it would take over, and an
 * acknowledgement for each type whose form would go blank on sites still
 * running the old client. It also names what no choice gets past. The dialog
 * asks each; this module decides what to ask, what to send, and how to read
 * back what the install did, with no view code.
 */

type UploadedPluginInfo =
  UploadedPluginInfoResult['centralServer']['plugin']['uploadedPluginInfo'];

/**
 * The preview a readable bundle answers; a bundle with no form plugin has an
 * empty `formPlugins`.
 */
export type FormInstallPreview = NonNullable<
  Extract<
    UploadedPluginInfo,
    { __typename: 'PluginInfoNode' }
  >['formInstallPreview']
>;
export type FormPluginPreview = FormInstallPreview['formPlugins'][number];
export type ProgramKeyPreview = FormPluginPreview['programKeys'][number];
export type DocumentTypePreview = FormPluginPreview['documentTypes'][number];
export type ProgramOption = FormInstallPreview['programs'][number];

/** What an install did to one registry entry, as the mutation answers it. */
export type InstalledDocumentType = NonNullable<
  InstallUploadedPluginResult['centralServer']['plugins']['installUploadedPlugin']['installedDocumentTypes']
>[number];

/** What the installer has chosen so far, as the dialog holds it. */
export interface InstallChoices {
  /**
   * Program key → the program chosen for it. Keyed by the key alone, across
   * every form plugin in the bundle, as the install mutation's `programs` is:
   * two plugins in one bundle declaring the same key share its program.
   */
  programs: Readonly<Record<string, string>>;
  /** Document types whose existing unowned entry the plugin may take over. */
  takeOver: readonly string[];
  /** Document types whose old-client form may go blank. */
  blankOldUi: readonly string[];
}

/**
 * The preview of a readable bundle, or undefined where the read answered
 * anything else: a file that is not a bundle (the install then refuses it
 * with the server's own description, as before), or a failed read.
 */
export const previewOf = (
  answer: UploadedPluginInfo | undefined
): FormInstallPreview | undefined =>
  answer?.__typename === 'PluginInfoNode'
    ? (answer.formInstallPreview ?? undefined)
    : undefined;

/** Whether the bundle carries anything to choose: a form plugin. */
export const needsChoices = (preview: FormInstallPreview): boolean =>
  preview.formPlugins.length > 0;

/** A form as a person knows it: the plugin's display name for the type. */
export const formName = (type: DocumentTypePreview): string =>
  type.name || type.documentType;

/** The declared types under one program key. */
export const typesUnderKey = (
  preview: FormInstallPreview,
  programKey: string
): DocumentTypePreview[] =>
  preview.formPlugins.flatMap(plugin =>
    plugin.documentTypes.filter(type => type.programKey === programKey)
  );

/**
 * The programs a key's forms are in on this server now: the distinct
 * programs of the entries the install would write over (a take-over's, or
 * the plugin's own). Empty on a server holding none of them.
 */
export const currentPrograms = (
  preview: FormInstallPreview,
  programKey: string
): ProgramOption[] => {
  const seen = new Map<string, ProgramOption>();
  for (const type of typesUnderKey(preview, programKey)) {
    const program = type.existingEntryProgram;
    if (program && !seen.has(program.id)) seen.set(program.id, program);
  }
  return [...seen.values()];
};

/**
 * Where the choices start. A key an earlier install bound keeps its program;
 * a key whose forms already sit in one program on this server — a
 * deployment's own entries, about to be taken over — starts on that program,
 * since choosing another would move them (rules › a bundle carrying form
 * plugins). Nothing is taken over or allowed to go blank until the user says
 * so.
 */
export const initialChoices = (
  preview: FormInstallPreview
): InstallChoices => ({
  programs: Object.fromEntries(
    preview.formPlugins.flatMap(plugin =>
      plugin.programKeys.flatMap(key => {
        if (key.boundProgram) return [[key.programKey, key.boundProgram.id]];
        const current = currentPrograms(preview, key.programKey);
        return current.length === 1 && current[0]
          ? [[key.programKey, current[0].id]]
          : [];
      })
    )
  ),
  takeOver: [],
  blankOldUi: [],
});

/** The program keys with no program chosen yet. */
export const unchosenKeys = (
  preview: FormInstallPreview,
  choices: InstallChoices
): ProgramKeyPreview[] =>
  preview.formPlugins.flatMap(plugin =>
    plugin.programKeys.filter(key => !choices.programs[key.programKey])
  );

/**
 * What the chosen program would move: for one key, each program its forms
 * are in on this server other than the one chosen, with the forms in it.
 * Empty while the key has no program, or when it keeps them where they are.
 * A warning, not a refusal: the server refuses a move only once records are
 * saved under the old program.
 */
export const programMoves = (
  preview: FormInstallPreview,
  choices: InstallChoices,
  programKey: string
): { from: ProgramOption; forms: DocumentTypePreview[] }[] => {
  const chosen = choices.programs[programKey];
  if (!chosen) return [];
  return currentPrograms(preview, programKey)
    .filter(program => program.id !== chosen)
    .map(from => ({
      from,
      forms: typesUnderKey(preview, programKey).filter(
        type => type.existingEntryProgram?.id === from.id
      ),
    }));
};

/**
 * The types whose existing entry no plugin installed: each needs a take-over
 * confirmed.
 */
export const takeOverCandidates = (
  preview: FormInstallPreview
): DocumentTypePreview[] =>
  preview.formPlugins.flatMap(plugin =>
    plugin.documentTypes.filter(type => type.existingEntry === 'UNOWNED')
  );

/**
 * The types whose old-client form the install would blank: each needs
 * acknowledging.
 */
export const blankOldUiCandidates = (
  preview: FormInstallPreview
): DocumentTypePreview[] =>
  preview.formPlugins.flatMap(plugin =>
    plugin.documentTypes.filter(type => type.blanksOldUi)
  );

/**
 * The types install will refuse whatever is chosen for the entry they meet:
 * an entry another plugin owns, several entries for one type, or an entry of
 * another category than the one declared.
 */
export const refusedTypes = (
  preview: FormInstallPreview
): DocumentTypePreview[] =>
  preview.formPlugins.flatMap(plugin =>
    plugin.documentTypes.filter(
      type =>
        type.existingEntry === 'OWNED_BY_ANOTHER_PLUGIN' ||
        type.existingEntry === 'AMBIGUOUS' ||
        type.existingEntry === 'CATEGORY_MISMATCH'
    )
  );

/**
 * The other refusals no choice gets past, in the server's own words: a schema
 * version already installed with other content, a version records are pinned
 * to left out, a take-over that would change the deployment's rules or
 * leaves its current version out, a second patient type (contract › preview).
 */
export const typeRefusals = (
  preview: FormInstallPreview
): { type: DocumentTypePreview; reason: string }[] =>
  preview.formPlugins.flatMap(plugin =>
    plugin.documentTypes.flatMap(type =>
      type.refusals.map(reason => ({ type, reason }))
    )
  );

/**
 * Whether the install may be sent: every key has a program, every take-over
 * is confirmed, every blanking is acknowledged, and nothing is refused up
 * front. The server checks all of it again.
 */
export const canInstall = (
  preview: FormInstallPreview,
  choices: InstallChoices
): boolean =>
  unchosenKeys(preview, choices).length === 0 &&
  takeOverCandidates(preview).every(type =>
    choices.takeOver.includes(type.documentType)
  ) &&
  blankOldUiCandidates(preview).every(type =>
    choices.blankOldUi.includes(type.documentType)
  ) &&
  refusedTypes(preview).length === 0 &&
  typeRefusals(preview).length === 0;

/**
 * The install call's variables. Every chosen program is sent, a re-install's
 * unchanged ones included: the server compares each with the entry's current
 * program and writes nothing for one that is the same.
 */
export const installVariables = (
  fileId: string,
  choices: InstallChoices
): InstallUploadedPluginVariables => ({
  fileId,
  programs: Object.entries(choices.programs).map(([programKey, programId]) => ({
    programKey,
    programId,
  })),
  takeOver: [...choices.takeOver],
  blankOldUi: [...choices.blankOldUi],
});

/**
 * The programs as a select offers them: by name, the id standing in for a
 * blank one.
 */
export const programOptions = (
  programs: readonly ProgramOption[]
): { value: string; label: string }[] =>
  [...programs]
    .map(program => ({ value: program.id, label: program.name || program.id }))
    .sort((a, b) => a.label.localeCompare(b.label));

/** A program by its name, the id standing in for a blank one. */
export const programName = (program: ProgramOption): string =>
  program.name || program.id;

/**
 * The install's report, read for a person: each registry entry it left, by
 * the form's name from the preview, with what happened to it and the program
 * it is in — the one chosen for its key, which is what the install bound
 * (the Patient form has no key, and no program). In the order the install
 * reports them (the bundle's).
 */
export const installReport = (
  preview: FormInstallPreview,
  choices: InstallChoices,
  installed: readonly InstalledDocumentType[]
): {
  documentType: string;
  name: string;
  outcome: InstalledDocumentType['outcome'];
  program: string | undefined;
  schemasAdded: number;
  uiSchemasUpdated: number;
}[] => {
  const types = new Map(
    preview.formPlugins
      .flatMap(plugin => plugin.documentTypes)
      .map(type => [type.documentType, type])
  );
  return installed.map(entry => {
    const type = types.get(entry.documentType);
    const programId = entry.programKey
      ? choices.programs[entry.programKey]
      : undefined;
    const program = preview.programs.find(p => p.id === programId);
    return {
      documentType: entry.documentType,
      name: type ? formName(type) : entry.documentType,
      outcome: entry.outcome,
      program: program ? programName(program) : undefined,
      schemasAdded: entry.schemasAdded,
      uiSchemasUpdated: entry.uiSchemasUpdated,
    };
  });
};

/** The choices with one key's program set. */
export const withProgram = (
  choices: InstallChoices,
  programKey: string,
  programId: string
): InstallChoices => ({
  ...choices,
  programs: { ...choices.programs, [programKey]: programId },
});

/** The choices with one type's take-over confirmed or withdrawn. */
export const withTakeOver = (
  choices: InstallChoices,
  documentType: string,
  confirmed: boolean
): InstallChoices => ({
  ...choices,
  takeOver: toggled(choices.takeOver, documentType, confirmed),
});

/** The choices with one type's blanking acknowledged or withdrawn. */
export const withBlankOldUi = (
  choices: InstallChoices,
  documentType: string,
  acknowledged: boolean
): InstallChoices => ({
  ...choices,
  blankOldUi: toggled(choices.blankOldUi, documentType, acknowledged),
});

const toggled = (
  list: readonly string[],
  item: string,
  present: boolean
): string[] =>
  present
    ? list.includes(item)
      ? [...list]
      : [...list, item]
    : list.filter(entry => entry !== item);
