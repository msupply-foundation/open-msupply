import { createSignal, For, Show } from 'solid-js';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
  type GraphqlErrorItem,
} from '@/api/graphql';
import { rejectionFrom, type Rejection } from '@/api/rejection';
import { reportUnauthenticated } from '@/auth/authContext';
import { formatFileSize, t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ErrorDetails } from '@/ui/elements/feedback/ErrorDetails';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Checkbox } from '@/ui/elements/inputs/Checkbox';
import { UploadZone } from '@/ui/elements/inputs/UploadZone';
import { Select } from '@/ui/elements/selectors/Select';
import { Text } from '@/ui/elements/typography/Text';
import type { FileRejection } from '@/ui/elements/inputs/uploadFiles';
import { HStack } from '@/ui/layout/Stack/HStack';
import { Stack } from '@/ui/layout/Stack/Stack';
import { CloseIcon, FileIcon } from '@/ui/icons';
import { InstallUploadedPlugin, UploadedPluginInfo } from './plugins.generated';
import {
  BUNDLE_ACCEPT,
  chooseBundle,
  MAX_BUNDLE_BYTES,
  uploadBundle,
} from './bundleFile';
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
  withBlankOldUi,
  withProgram,
  withTakeOver,
  type DocumentTypePreview,
  type FormInstallPreview,
  type InstallChoices,
  type ProgramKeyPreview,
} from './formInstall';

/*
 * S2 — Upload dialog (spec/plugin-management/ui-surface.md): install ONE
 * bundle file. Upload then install, seen by the user as one step; the dialog
 * holds until the outcome is known (rules › installing a bundle).
 *
 * A bundle carrying a FORM plugin needs the installer's choices first (rules
 * › a bundle carrying form plugins): the server reads the uploaded bundle
 * against its registry and names them — a program for each program key, a
 * take-over to confirm for each entry no plugin installed, an acknowledgement
 * for each type whose form would go blank on the old interface. Upload plugin
 * then stages the bundle and asks; Install plugin sends the choices with the
 * install. A bundle with no form plugin never pauses.
 *
 * Mounted only while open (the list gates it), so every open starts with no
 * file chosen and no notice.
 */

type Notice =
  | { kind: 'refused'; rejection: FileRejection<File> }
  | { kind: 'upload'; status: string }
  | { kind: 'install'; rejection: Rejection };

/**
 * An uploaded bundle awaiting its choices: the file as the server holds it.
 * `fileId` is cleared once the server reports that upload gone (it keeps one
 * for an hour): the next Install plugin sends the file again, choices kept.
 */
interface Staged {
  fileId: string | undefined;
  preview: FormInstallPreview;
}

/**
 * What one Upload plugin leaves: the file's id, and its preview where the
 * file read as a bundle.
 */
interface Uploaded {
  fileId: string;
  preview: FormInstallPreview | undefined;
}

// The install's refusal for an upload the server no longer holds (contract §
// install: an unknown or swept fileId answers details `File not found`).
const isUploadGone = (errors: GraphqlErrorItem[]): boolean =>
  errors.some(error => error.extensions?.details === 'File not found');

// A registry category as the preview names it, by its label where one exists.
const CATEGORY_LABEL: Partial<Record<string, Parameters<typeof t>[0]>> = {
  PATIENT: 'label.patient',
  PROGRAM_ENROLMENT: 'label.program-enrolment',
  ENCOUNTER: 'label.encounter',
  CUSTOM: 'label.custom',
};
const categoryLabel = (category: string | null | undefined): string => {
  if (!category) return '';
  const key = CATEGORY_LABEL[category];
  return key ? t(key) : category;
};

const NO_CHOICES: InstallChoices = {
  programs: {},
  takeOver: [],
  blankOldUi: [],
};

export const UploadPluginDialog = (props: {
  onClose: () => void;
  /** An install was attempted — the list reads again, whatever the outcome. */
  onAttempted: () => void;
}) => {
  const [file, setFile] = createSignal<File>();
  const [notice, setNotice] = createSignal<Notice>();
  const [running, setRunning] = createSignal(false);
  const [staged, setStaged] = createSignal<Staged>();
  const [choices, setChoices] = createSignal<InstallChoices>(NO_CHOICES);

  // A change of file discards the staged bundle and its choices
  // (OMS-REG-MNG-07.75): the next Upload plugin reads the new file.
  const choose = (chosen: File | undefined) => {
    setFile(chosen);
    setStaged(undefined);
    setChoices(NO_CHOICES);
    setNotice(undefined);
  };

  // One pick or drop, decided as a whole: a drop of several files chooses
  // none whatever they are (rules › installing a bundle), which is why the
  // zone's combined `onPick` is used rather than its per-half callbacks.
  const pick = (accepted: File[], rejected: FileRejection<File>[]): void => {
    const choice = chooseBundle(accepted, rejected);
    if (choice.kind === 'chosen') {
      choose(choice.file);
    } else if (choice.kind === 'refused') {
      // The chosen file, if any, stays (OMS-REG-MNG-07.23).
      setNotice({ kind: 'refused', rejection: choice.rejection });
    }
  };

  // A failed step's notice: the step, the server's reason, and a multi-line
  // dump behind the disclosure (ui-standards › controls § action feedback).
  const stepAlert = (step: string, rejection: Rejection) => (
    <Alert severity="error" testId="upload-plugin-error">
      {[step, rejection.message].filter(Boolean).join(': ')}
      <Show when={rejection.detail}>
        {detail => <ErrorDetails detail={detail()} />}
      </Show>
    </Alert>
  );

  // Upload, then read the bundle. The read's answer is the preview where the
  // file reads as a bundle; where it does not, there is none, and the install
  // that follows refuses the file with the server's own words, as it always
  // has. A failure graphqlFetch has already reported — a dropped connection,
  // an ended session, an abort — stops here, as it does for every call: the
  // install is not sent to fail the same way again.
  const uploadAndRead = async (chosen: File): Promise<Uploaded | undefined> => {
    const uploaded = await uploadBundle(chosen);
    if (!uploaded.ok) {
      setNotice({ kind: 'upload', status: uploaded.status });
      // The upload is not a GraphQL call, so graphqlFetch never sees its
      // session end: report it here, and the app's re-login modal opens over
      // this dialog. The file stays chosen for the retry (OMS-REG-MNG-07.64).
      if (uploaded.signedOut) reportUnauthenticated();
      return undefined;
    }
    const info = await graphqlFetch(
      UploadedPluginInfo,
      { fileId: uploaded.fileId },
      { returnGraphqlErrors: true }
    );
    if (info.kind !== 'success' && info.kind !== 'graphqlError')
      return undefined;
    // Kept local: a GraphQL answer other than the preview — the typed
    // cannot-parse error, or an error the install would answer alike — is not
    // the outcome; the install that follows reports its own.
    return {
      fileId: uploaded.fileId,
      preview:
        info.kind === 'success'
          ? previewOf(info.data.centralServer.plugin.uploadedPluginInfo)
          : undefined,
    };
  };

  const confirm = async () => {
    const chosen = file();
    if (!chosen || running()) return;
    setRunning(true);
    setNotice(undefined);
    const held = staged();
    let fileId = held?.fileId;
    if (fileId === undefined) {
      const read = await uploadAndRead(chosen);
      if (!read) {
        // The upload or the read failed, and said so: the dialog waits on
        // the user, the file still chosen.
        setRunning(false);
        return;
      }
      fileId = read.fileId;
      if (held) {
        // A held bundle whose upload the server had discarded: the same file
        // is up again under a new id, and the choices made stand.
        setStaged({ fileId, preview: held.preview });
      } else if (read.preview && needsChoices(read.preview)) {
        // A form plugin's bundle is staged for its choices and the dialog
        // asks; nothing is installed until Install plugin.
        setStaged({ fileId, preview: read.preview });
        setChoices(initialChoices(read.preview));
        setRunning(false);
        return;
      }
    }
    const result = await graphqlFetch(
      InstallUploadedPlugin,
      held ? installVariables(fileId, choices()) : { fileId },
      { returnGraphqlErrors: true }
    );
    props.onAttempted();
    if (result.kind === 'success') {
      // Closing is the confirmation; the list's new rows are the result
      // (ui-standards › controls § dialogs).
      props.onClose();
      return;
    }
    if (result.kind === 'graphqlError') {
      // A Forbidden goes to the permission-denied modal, as every other one.
      if (isForbidden(result.errors))
        reportPermissionDenied(missingPermissions(result.errors));
      else {
        setNotice({
          kind: 'install',
          rejection: rejectionFrom(result.errors, ''),
        });
        // The server keeps an upload for an hour: a held bundle refused as
        // gone is sent again by the next Install plugin, its choices kept
        // (rules › a bundle carrying form plugins).
        if (held && isUploadGone(result.errors))
          setStaged({ fileId: undefined, preview: held.preview });
      }
    }
    // Any other failure surfaced globally; release the busy state either way.
    // The choices stay for the retry (OMS-REG-MNG-07.73).
    setRunning(false);
  };

  const refusalText = (rejection: FileRejection<File>): string =>
    rejection.reason === 'size'
      ? t('error.file-exceeds-size-limit', {
          filename: rejection.file.name,
          maxSize: formatFileSize(MAX_BUNDLE_BYTES),
        })
      : t('error.plugin-invalid-file');

  // Install plugin waits for every choice the preview asks (rules › a bundle
  // carrying form plugins); Upload plugin only for a file.
  const confirmDisabled = () => {
    const stagedBundle = staged();
    return stagedBundle
      ? !canInstall(stagedBundle.preview, choices())
      : !file();
  };

  const keyHelper = (key: ProgramKeyPreview): string =>
    [
      t('messages.program-key-document-types', {
        types: key.documentTypes.join(', '),
      }),
      key.boundProgram
        ? t('messages.program-key-bound', {
            program: key.boundProgram.name || key.boundProgram.id,
          })
        : undefined,
    ]
      .filter(Boolean)
      .join(' ');

  const refusedText = (type: DocumentTypePreview): string => {
    switch (type.existingEntry) {
      case 'OWNED_BY_ANOTHER_PLUGIN':
        return t('error.form-plugin-type-owned', {
          documentType: type.documentType,
          owner: type.existingEntryOwner ?? '',
        });
      case 'CATEGORY_MISMATCH':
        return t('error.form-plugin-type-category', {
          documentType: type.documentType,
          existing: categoryLabel(type.existingEntryCategory),
          declared: categoryLabel(type.category),
        });
      default:
        return t('error.form-plugin-type-ambiguous', {
          documentType: type.documentType,
        });
    }
  };

  return (
    <Dialog
      open
      onClose={props.onClose}
      // Blocking while the upload and install run: the outcome is reported in
      // this dialog, so it cannot be dismissed from under it
      // (OMS-REG-MNG-07.35).
      dismissable={!running()}
      title={t('title.upload-plugin')}
      width="prose"
      testId="upload-plugin-dialog"
      actions={
        <>
          <Show when={!running()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          <Button
            variant="primary"
            confirms="plain"
            data-testid="dialog-button-ok"
            disabled={confirmDisabled()}
            loading={running()}
            onClick={() => void confirm()}
          >
            {staged() ? t('button.install-plugin') : t('button.upload-plugin')}
          </Button>
        </>
      }
    >
      <Stack gap="md">
        <Text>{t('messages.plugin-upload-helper')}</Text>
        <UploadZone
          accept={BUNDLE_ACCEPT}
          maxSize={MAX_BUNDLE_BYTES}
          multiple={false}
          disabled={running()}
          inputTestId="upload-plugin-file-input"
          testId="upload-plugin-drop-zone"
          onPick={pick}
        />
        <Show when={file()}>
          {chosen => (
            <HStack gap="sm" align="center">
              <FileIcon />
              <Text variant="bodySmall" data-testid="upload-plugin-chosen-file">
                {chosen().name}
              </Text>
              <IconButton
                icon={<CloseIcon />}
                label={t('button.remove-file')}
                size="small"
                disabled={running()}
                data-testid="upload-plugin-remove-file"
                onClick={() => choose(undefined)}
              />
            </HStack>
          )}
        </Show>
        <Show when={staged()}>
          {stagedBundle => (
            <FormPluginChoices
              preview={stagedBundle().preview}
              choices={choices()}
              disabled={running()}
              keyHelper={keyHelper}
              refusedText={refusedText}
              onProgram={(key, id) =>
                setChoices(current => withProgram(current, key, id))
              }
              onTakeOver={(type, on) =>
                setChoices(current => withTakeOver(current, type, on))
              }
              onBlankOldUi={(type, on) =>
                setChoices(current => withBlankOldUi(current, type, on))
              }
            />
          )}
        </Show>
        {/* Keyed: each notice is its own object, so a second refusal of
            another kind re-renders rather than keeping the first one's body. */}
        <Show when={notice()} keyed>
          {value => {
            if (value.kind === 'refused')
              return (
                <Alert severity="error" testId="upload-plugin-error">
                  {refusalText(value.rejection)}
                </Alert>
              );
            if (value.kind === 'upload')
              return stepAlert(t('error.unable-to-upload-plugin'), {
                message: value.status,
              });
            return stepAlert(
              t('error.unable-to-install-plugin'),
              value.rejection
            );
          }}
        </Show>
      </Stack>
    </Dialog>
  );
};

/*
 * The form-plugin step (ui-surface S2 › a bundle carrying form plugins): per
 * plugin, a program select for each of its program keys; then each take-over
 * to confirm and each blanking to acknowledge, as checkboxes that start off;
 * and, first, any type the install will refuse whatever is chosen.
 */
const FormPluginChoices = (props: {
  preview: FormInstallPreview;
  choices: InstallChoices;
  disabled: boolean;
  keyHelper: (key: ProgramKeyPreview) => string;
  refusedText: (type: DocumentTypePreview) => string;
  onProgram: (programKey: string, programId: string) => void;
  onTakeOver: (documentType: string, confirmed: boolean) => void;
  onBlankOldUi: (documentType: string, acknowledged: boolean) => void;
}) => {
  const options = () => programOptions(props.preview.programs);
  return (
    <div data-testid="upload-plugin-form-choices">
      <Stack gap="md">
        <Text>{t('messages.form-plugin-choose-programs')}</Text>
        <For each={refusedTypes(props.preview)}>
          {type => (
            <Alert severity="error" testId="upload-plugin-refused-type">
              {props.refusedText(type)}
            </Alert>
          )}
        </For>
        <Show when={options().length === 0}>
          <Alert severity="warning" testId="upload-plugin-no-programs">
            {t('messages.no-programs-on-server')}
          </Alert>
        </Show>
        <For each={props.preview.formPlugins}>
          {plugin => (
            <Stack gap="sm">
              <Text variant="bodySmall">
                {t('label.form-plugin-code', { code: plugin.pluginCode })}
              </Text>
              <For each={plugin.programKeys}>
                {key => (
                  <Select
                    label={key.programKey}
                    options={options()}
                    value={props.choices.programs[key.programKey]}
                    onValueChange={id => props.onProgram(key.programKey, id)}
                    placeholder={t('placeholder.choose-program')}
                    helperText={props.keyHelper(key)}
                    required
                    disabled={props.disabled}
                    testId={`upload-plugin-program-${key.programKey}`}
                  />
                )}
              </For>
            </Stack>
          )}
        </For>
        <For each={takeOverCandidates(props.preview)}>
          {type => (
            <Stack gap="sm">
              <Checkbox
                label={t('label.take-over-entry', {
                  documentType: type.documentType,
                })}
                checked={props.choices.takeOver.includes(type.documentType)}
                onChange={on => props.onTakeOver(type.documentType, on)}
                disabled={props.disabled}
                testId={`upload-plugin-take-over-${type.documentType}`}
              />
              <Text variant="bodySmall">
                {t('messages.take-over-entry', {
                  documentType: type.documentType,
                  id: type.existingEntryId ?? '',
                })}
              </Text>
            </Stack>
          )}
        </For>
        <For each={blankOldUiCandidates(props.preview)}>
          {type => (
            <Stack gap="sm">
              <Checkbox
                label={t('label.blank-old-ui', {
                  documentType: type.documentType,
                })}
                checked={props.choices.blankOldUi.includes(type.documentType)}
                onChange={on => props.onBlankOldUi(type.documentType, on)}
                disabled={props.disabled}
                testId={`upload-plugin-blank-old-ui-${type.documentType}`}
              />
              <Text variant="bodySmall">
                {t('messages.blank-old-ui', {
                  documentType: type.documentType,
                })}
              </Text>
            </Stack>
          )}
        </For>
      </Stack>
    </div>
  );
};
