import React, { useState } from 'react';
import { FormControlLabel } from '@mui/material';
import { FileList } from '../../../Documents';
import { Environment } from '@openmsupply-client/config';
import {
  useTranslation,
  Alert,
  Box,
  Checkbox,
  DialogButton,
  DocumentRegistryCategoryNode,
  ExistingRegistryEntryNode,
  RegistryOutcomeNode,
  Select,
  Typography,
  useDialog,
  useNotification,
  DetailContainer,
  UploadFile,
} from '@openmsupply-client/common';
import {
  InstallUploadedPluginMutation,
  InstallUploadedPluginMutationVariables,
  UploadedPluginInfoQuery,
} from '../api/operations.generated';
import {
  blankOldUiCandidates,
  canInstall,
  currentPrograms,
  formName,
  initialChoices,
  installReport,
  installVariables,
  needsChoices,
  NO_CHOICES,
  previewOf,
  programMoves,
  programName,
  programOptions,
  refusedTypes,
  takeOverCandidates,
  typeRefusals,
  typesUnderKey,
  withBlankOldUis,
  blankOldUisAcknowledged,
  withProgram,
  withTakeOvers,
  takeOversConfirmed,
  DocumentTypePreview,
  FormInstallPreview,
  InstallChoices,
  ProgramKeyPreview,
} from './formInstall';

type UploadedPluginInfo =
  UploadedPluginInfoQuery['centralServer']['plugin']['uploadedPluginInfo'];

/**
 * What an install answers. Nothing where the client resolved the request
 * without data (a permission denied, reported by its own modal).
 */
type InstallResult =
  | InstallUploadedPluginMutation['centralServer']['plugins']['installUploadedPlugin']
  | undefined;

/** What a form plugin's install did to each form, as the modal shows it. */
type Report = ReturnType<typeof installReport>;

/** One install's outcome: its answer, or the message its refusal gave. */
type Installed =
  | { ok: true; result: InstallResult }
  | { ok: false; message: string };

// The install's refusal for an upload the server no longer holds (contract §
// install: an unknown or swept fileId answers details `File not found`, which
// this client's GraphQL client raises as the error's message).
const isUploadGone = (message: string): boolean =>
  message.includes('File not found');

interface PluginUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  install: (
    variables: InstallUploadedPluginMutationVariables
  ) => Promise<InstallResult>;
  /** The read before an install: what a bundle's form plugins need chosen. */
  preview: (fileId: string) => Promise<UploadedPluginInfo | undefined>;
  isInstalling: boolean;
}

/**
 * A bundle uploaded and read, waiting on the installer's choices
 * (spec/plugin-management/rules.md › a bundle carrying form plugins): a
 * program for each program key, a take-over to confirm for each registry
 * entry no plugin installed, an acknowledgement for each type whose form
 * would go blank on this client. Nothing is installed while a bundle is held.
 */
interface Held {
  file: File;
  /**
   * The upload as the server holds it. Cleared once the server reports it
   * gone (it keeps an upload for an hour): the next Install plugin sends the
   * file again, the choices kept.
   */
  fileId: string | undefined;
  preview: FormInstallPreview;
}

export const PluginUploadModal = ({
  isOpen,
  onClose,
  install,
  preview,
  isInstalling,
}: PluginUploadModalProps) => {
  const t = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [held, setHeld] = useState<Held | null>(null);
  const [choices, setChoices] = useState<InstallChoices>(NO_CHOICES);
  const [busy, setBusy] = useState(false);
  // A form plugin's install, done: what it did to each form, shown until
  // Close (OMS-REG-MNG-07.80).
  const [report, setReport] = useState<Report | null>(null);
  const { error, success } = useNotification();

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  // A change of file discards the held bundle and its choices: the next OK
  // reads the new file.
  const discard = () => {
    setHeld(null);
    setChoices(NO_CHOICES);
  };

  const onUpload = (newFiles: File[]) => {
    const invalidFiles = newFiles.filter(f => !f.name.endsWith('.json'));
    if (invalidFiles.length > 0) {
      error(t('error.plugin-invalid-file'))();
      return;
    }
    setFiles(newFiles);
    discard();
  };

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    discard();
  };

  const upload = async (file: File): Promise<string | undefined> => {
    try {
      const formData = new FormData();
      formData.append('files', file);
      const response = await fetch(Environment.REPORT_UPLOAD_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`
        );
      }
      const result = await response.json();
      return result['file-id'];
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error(`${t('error.unable-to-upload-plugin')}: ${message}`)();
      return undefined;
    }
  };

  const installOne = async (
    variables: InstallUploadedPluginMutationVariables
  ): Promise<Installed> => {
    try {
      return { ok: true, result: await install(variables) };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error(`${t('error.unable-to-install-plugin')}: ${message}`)();
      return { ok: false, message };
    }
  };

  // Upload and read each file in turn. A bundle carrying a form plugin is
  // held for its choices, the files after it waiting; anything else — no
  // form plugin, or a file the read answered it could not parse — installs at
  // once, as before, so a non-bundle is still refused by the install with the
  // server's own words. `reported` is what a held bundle's install, just
  // done, did to its forms: shown once the files after it are in, in place
  // of the toast and close. (The picker takes one file, so in practice
  // nothing follows a held bundle; were another one held, its choices would
  // take the modal over and that report would not be shown.)
  const run = async (queue: File[], reported?: Report) => {
    for (const [i, file] of queue.entries()) {
      const fileId = await upload(file);
      if (!fileId) return;
      let answer: UploadedPluginInfo | undefined;
      try {
        answer = await preview(fileId);
      } catch (e) {
        // The read failed outright — a dropped connection, an ended session:
        // stop here, the file still chosen, rather than send the install to
        // fail the same way, or to refuse a form bundle as having no program
        // chosen.
        const message = e instanceof Error ? e.message : String(e);
        error(`${t('error.unable-to-install-plugin')}: ${message}`)();
        return;
      }
      const read = previewOf(answer);
      if (read && needsChoices(read)) {
        setHeld({ file, fileId, preview: read });
        setChoices(initialChoices(read));
        setFiles(queue.slice(i));
        return;
      }
      if (!(await installOne({ fileId })).ok) return;
    }
    if (reported) {
      setReport(reported);
      return;
    }
    success(t('messages.plugin-uploaded-successfully'))();
    onClose();
  };

  // A held bundle's install, with the choices made. A refusal keeps the held
  // bundle and every choice for a retry.
  const installHeld = async (bundle: Held) => {
    let fileId = bundle.fileId;
    if (fileId === undefined) {
      // The server had discarded the upload: the same file goes up again
      // under a new id, and the choices made stand.
      fileId = await upload(bundle.file);
      if (!fileId) return;
      setHeld({ ...bundle, fileId });
    }
    const installed = await installOne(installVariables(fileId, choices));
    if (!installed.ok) {
      // The server keeps an upload for an hour: a held bundle refused as
      // gone is sent again by the next Install plugin.
      if (isUploadGone(installed.message))
        setHeld({ ...bundle, fileId: undefined });
      return;
    }
    const rest = files.filter(f => f !== bundle.file);
    discard();
    setFiles(rest);
    // A form plugin's install says what it did to each form, as the command
    // line does, before the modal closes (OMS-REG-MNG-07.80).
    const lines = installed.result?.installedDocumentTypes;
    await run(
      rest,
      lines ? installReport(bundle.preview, choices, lines) : undefined
    );
  };

  const onOk = async () => {
    if (busy || !files.length) return;
    setBusy(true);
    try {
      if (held) await installHeld(held);
      else await run(files);
    } finally {
      setBusy(false);
    }
  };

  // Install plugin waits for every choice the preview asks; OK only for a
  // file.
  const okDisabled =
    isInstalling ||
    busy ||
    !files.length ||
    (held !== null && !canInstall(held.preview, choices));

  // Once the report shows, the install is done: Close is the only action.
  if (report)
    return (
      <Modal
        title={t('title.upload-plugin')}
        cancelButton={<DialogButton variant="close" onClick={onClose} />}
      >
        <InstallReport report={report} />
      </Modal>
    );

  return (
    <Modal
      title={t('title.upload-plugin')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          customLabel={held ? t('button.install-plugin') : undefined}
          onClick={onOk}
          disabled={okDisabled}
        />
      }
    >
      <DetailContainer>
        <Box flex={1} display="flex" alignItems="flex-end">
          <Typography>{t('messages.plugin-upload-helper')}</Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            marginTop: 2,
            padding: 0,
            alignItems: 'center',
            height: '100%',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <UploadFile onUpload={onUpload} files={files} />
        </Box>
        <Box sx={{ display: 'flex', width: '300px' }}>
          <FileList
            assetId={'plugin-data'}
            files={files}
            padding={0.5}
            removeFile={removeFile}
          />
        </Box>
        {held && (
          <FormPluginChoices
            preview={held.preview}
            choices={choices}
            disabled={busy}
            onProgram={(key, id) =>
              setChoices(current => withProgram(current, key, id))
            }
            onTakeOvers={on =>
              setChoices(current => withTakeOvers(held.preview, current, on))
            }
            onBlankOldUis={on =>
              setChoices(current => withBlankOldUis(held.preview, current, on))
            }
          />
        )}
      </DetailContainer>
    </Modal>
  );
};

/*
 * What a form plugin's install did to each form (OMS-REG-MNG-07.80): its
 * outcome, the program it is in, and how many versions and old-interface
 * layouts it wrote.
 */
const InstallReport = ({ report }: { report: Report }) => {
  const t = useTranslation();

  const outcomeLabel = (outcome: RegistryOutcomeNode): string => {
    switch (outcome) {
      case RegistryOutcomeNode.Created:
        return t('label.form-outcome-created');
      case RegistryOutcomeNode.Updated:
        return t('label.form-outcome-updated');
      case RegistryOutcomeNode.TakenOver:
        return t('label.form-outcome-taken-over');
      case RegistryOutcomeNode.Unchanged:
        return t('label.form-outcome-unchanged');
    }
  };

  const reportLine = (row: Report[number]): string => {
    const outcome = outcomeLabel(row.outcome);
    const counts = {
      versions: String(row.schemasAdded),
      layouts: String(row.uiSchemasUpdated),
    };
    return row.program
      ? t('messages.form-outcome-detail', {
          outcome,
          program: row.program,
          ...counts,
        })
      : t('messages.form-outcome-detail-no-program', { outcome, ...counts });
  };

  return (
    <Alert severity="success" data-testid="upload-plugin-report">
      <Typography>{t('messages.form-plugin-installed')}</Typography>
      <ul>
        {report.map(row => (
          <li
            key={row.documentType}
            data-testid={`upload-plugin-report-${row.documentType}`}
          >
            {row.name}: {reportLine(row)}
          </li>
        ))}
      </ul>
    </Alert>
  );
};

/*
 * The form-plugin step, as the Solid front end's: first what the install will
 * refuse whatever is chosen; then, per plugin, a program select for each of
 * its program keys, with a warning where the program chosen moves forms out
 * of the one they are in; then the forms already on this server to take
 * over, and the forms the old interface would show empty, each listed by
 * name under one message with one checkbox for the list, unticked
 * (OMS-REG-MNG-07.70, .71).
 */
const FormPluginChoices = ({
  preview,
  choices,
  disabled,
  onProgram,
  onTakeOvers,
  onBlankOldUis,
}: {
  preview: FormInstallPreview;
  choices: InstallChoices;
  disabled: boolean;
  onProgram: (programKey: string, programId: string) => void;
  onTakeOvers: (confirmed: boolean) => void;
  onBlankOldUis: (acknowledged: boolean) => void;
}) => {
  const t = useTranslation();
  const options = programOptions(preview.programs);
  const takeOvers = takeOverCandidates(preview);
  const blanks = blankOldUiCandidates(preview);

  // Under a key's select: its forms by name, then where they stand — the
  // program an earlier install bound the key to, or the one the forms are in
  // on this server now (OMS-REG-MNG-07.68, .78).
  const keyHelper = (key: ProgramKeyPreview): string => {
    const current = currentPrograms(preview, key.programKey);
    const where = key.boundProgram
      ? t('messages.program-key-bound', {
          program: programName(key.boundProgram),
        })
      : current.length === 1 && current[0]
        ? t('messages.program-key-current', {
            program: programName(current[0]),
          })
        : undefined;
    return [
      t('messages.program-key-forms', {
        forms: typesUnderKey(preview, key.programKey).map(formName).join(', '),
      }),
      where,
    ]
      .filter(Boolean)
      .join(' ');
  };

  // A registry category as the preview names it, by its label where one exists.
  const categoryLabel = (
    category: DocumentRegistryCategoryNode | null | undefined
  ): string => {
    switch (category) {
      case DocumentRegistryCategoryNode.Patient:
        return t('label.patient');
      case DocumentRegistryCategoryNode.ProgramEnrolment:
        return t('label.program-enrolment');
      case DocumentRegistryCategoryNode.Encounter:
        return t('label.encounter');
      case DocumentRegistryCategoryNode.Custom:
        return t('label.custom');
      default:
        return category ?? '';
    }
  };

  const refusedText = (type: DocumentTypePreview): string => {
    switch (type.existingEntry) {
      case ExistingRegistryEntryNode.OwnedByAnotherPlugin:
        return t('error.form-plugin-type-owned', {
          form: formName(type),
          owner: type.existingEntryOwner ?? '',
        });
      case ExistingRegistryEntryNode.CategoryMismatch:
        return t('error.form-plugin-type-category', {
          form: formName(type),
          existing: categoryLabel(type.existingEntryCategory),
          declared: categoryLabel(type.category),
        });
      default:
        return t('error.form-plugin-type-ambiguous', {
          form: formName(type),
        });
    }
  };

  return (
    <Box
      data-testid="upload-plugin-form-choices"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
        marginTop: 2,
      }}
    >
      <Typography>{t('messages.form-plugin-choose-programs')}</Typography>
      {refusedTypes(preview).map(type => (
        <Alert
          key={type.documentType}
          severity="error"
          data-testid="upload-plugin-refused-type"
        >
          {refusedText(type)}
        </Alert>
      ))}
      {typeRefusals(preview).map(({ type, reason }) => (
        <Alert
          key={`${type.documentType}-${reason}`}
          severity="error"
          data-testid="upload-plugin-type-refusal"
        >
          {reason}
        </Alert>
      ))}
      {options.length === 0 && (
        <Alert severity="warning" data-testid="upload-plugin-no-programs">
          {t('messages.no-programs-on-server')}
        </Alert>
      )}
      {preview.formPlugins.map(plugin => (
        <Box
          key={plugin.pluginCode}
          sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('label.form-plugin-code', { code: plugin.pluginCode })}
          </Typography>
          {plugin.programKeys.map(key => (
            <Box
              key={key.programKey}
              sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
            >
              <Select
                label={t('label.program-for-key', { key: key.programKey })}
                required
                fullWidth
                options={options}
                value={choices.programs[key.programKey] ?? ''}
                onChange={e => onProgram(key.programKey, e.target.value)}
                helperText={keyHelper(key)}
                disabled={disabled}
                // On the select's trigger, as e2e/TESTIDS.md places it.
                slotProps={{
                  select: {
                    SelectDisplayProps: {
                      'data-testid': `upload-plugin-program-${key.programKey}`,
                    } as React.HTMLAttributes<HTMLDivElement>,
                  },
                }}
              />
              {/* A warning, not a refusal: the server refuses a move only
                once records are saved under the old program. */}
              {programMoves(preview, choices, key.programKey).map(move => (
                <Alert
                  key={move.from.id}
                  severity="warning"
                  data-testid={`upload-plugin-program-moves-${key.programKey}`}
                >
                  {t('messages.program-key-moves', {
                    forms: move.forms.map(formName).join(', '),
                    program: programName(move.from),
                  })}
                </Alert>
              ))}
            </Box>
          ))}
        </Box>
      ))}
      {takeOvers.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {t('heading.forms-on-server')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('messages.forms-on-server')}
          </Typography>
          <Box component="ul" data-testid="upload-plugin-take-over-forms">
            {takeOvers.map(type => (
              <li
                key={type.documentType}
                data-testid={`upload-plugin-take-over-form-${type.documentType}`}
              >
                <Typography variant="body2">{formName(type)}</Typography>
              </li>
            ))}
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={takeOversConfirmed(preview, choices)}
                onChange={(_, on) => onTakeOvers(on)}
                disabled={disabled}
                testId="upload-plugin-take-over"
              />
            }
            label={t('label.take-over-forms')}
          />
        </Box>
      )}
      {blanks.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {t('heading.forms-blank-old-ui')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('messages.forms-blank-old-ui')}
          </Typography>
          <Box component="ul" data-testid="upload-plugin-blank-old-ui-forms">
            {blanks.map(type => (
              <li
                key={type.documentType}
                data-testid={`upload-plugin-blank-old-ui-form-${type.documentType}`}
              >
                <Typography variant="body2">{formName(type)}</Typography>
              </li>
            ))}
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={blankOldUisAcknowledged(preview, choices)}
                onChange={(_, on) => onBlankOldUis(on)}
                disabled={disabled}
                testId="upload-plugin-blank-old-ui"
              />
            }
            label={t('label.accept-blank-old-ui')}
          />
        </Box>
      )}
    </Box>
  );
};
