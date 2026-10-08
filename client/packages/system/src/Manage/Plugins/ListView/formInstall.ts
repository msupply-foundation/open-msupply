import { ExistingRegistryEntryNode } from '@openmsupply-client/common';
import {
  InstallUploadedPluginMutationVariables,
  UploadedPluginInfoQuery,
} from '../api/operations.generated';

/*
 * A form plugin's installer choices (spec/plugin-management/rules.md ›
 * installing a bundle § a bundle carrying form plugins). The server reads the
 * uploaded bundle against its own registry and says what an install needs
 * chosen: a program for each program key, a confirmation for each registry
 * entry it would take over, and an acknowledgement for each type whose form
 * would go blank on sites still running this (old) client. The modal asks
 * each; this module decides what to ask and what to send, with no view code.
 * The same decisions as the Solid front end's
 * frontend/src/sections/plugin-management/formInstall.ts.
 */

type UploadedPluginInfo =
  UploadedPluginInfoQuery['centralServer']['plugin']['uploadedPluginInfo'];

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

/** What the installer has chosen so far, as the modal holds it. */
export interface InstallChoices {
  /** Program key → the program chosen for it. */
  programs: Readonly<Record<string, string>>;
  /** Document types whose existing unowned entry the plugin may take over. */
  takeOver: readonly string[];
  /** Document types whose old-client form may go blank. */
  blankOldUi: readonly string[];
}

export const NO_CHOICES: InstallChoices = {
  programs: {},
  takeOver: [],
  blankOldUi: [],
};

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

/**
 * Where the choices start: each key bound by an earlier install keeps its
 * program, and nothing is taken over or allowed to go blank until the user
 * says so.
 */
export const initialChoices = (
  preview: FormInstallPreview
): InstallChoices => ({
  programs: Object.fromEntries(
    preview.formPlugins.flatMap(plugin =>
      plugin.programKeys.flatMap(key =>
        key.boundProgram ? [[key.programKey, key.boundProgram.id]] : []
      )
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

/** The types whose existing entry no plugin installed: each needs a take-over confirmed. */
export const takeOverCandidates = (
  preview: FormInstallPreview
): DocumentTypePreview[] =>
  preview.formPlugins.flatMap(plugin =>
    plugin.documentTypes.filter(
      type => type.existingEntry === ExistingRegistryEntryNode.Unowned
    )
  );

/** The types whose old-client form the install would blank: each needs acknowledging. */
export const blankOldUiCandidates = (
  preview: FormInstallPreview
): DocumentTypePreview[] =>
  preview.formPlugins.flatMap(plugin =>
    plugin.documentTypes.filter(type => type.blanksOldUi)
  );

/**
 * The types install will refuse whatever is chosen: an entry another plugin
 * owns, or several entries for one type. Shown before installing, since no
 * choice gets past them.
 */
export const refusedTypes = (
  preview: FormInstallPreview
): DocumentTypePreview[] =>
  preview.formPlugins.flatMap(plugin =>
    plugin.documentTypes.filter(
      type =>
        type.existingEntry === ExistingRegistryEntryNode.OwnedByAnotherPlugin ||
        type.existingEntry === ExistingRegistryEntryNode.Ambiguous
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
  refusedTypes(preview).length === 0;

/**
 * The install call's variables. Every chosen program is sent, a re-install's
 * unchanged ones included: the server compares each with the entry's current
 * program and writes nothing for one that is the same.
 */
export const installVariables = (
  fileId: string,
  choices: InstallChoices
): InstallUploadedPluginMutationVariables => ({
  fileId,
  programs: Object.entries(choices.programs).map(([programKey, programId]) => ({
    programKey,
    programId,
  })),
  takeOver: [...choices.takeOver],
  blankOldUi: [...choices.blankOldUi],
});

/** The programs as a select offers them: by name, the id standing in for a blank one. */
export const programOptions = (
  programs: readonly ProgramOption[]
): { value: string; label: string }[] =>
  [...programs]
    .map(program => ({ value: program.id, label: program.name || program.id }))
    .sort((a, b) => a.label.localeCompare(b.label));

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
