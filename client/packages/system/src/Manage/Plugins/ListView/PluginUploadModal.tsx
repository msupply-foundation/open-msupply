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
  ExistingRegistryEntryNode,
  Select,
  Typography,
  useDialog,
  useNotification,
  DetailContainer,
  UploadFile,
} from '@openmsupply-client/common';
import {
  InstallUploadedPluginMutationVariables,
  UploadedPluginInfoQuery,
} from '../api/operations.generated';
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
  withBlankOldUi,
  withProgram,
  withTakeOver,
  DocumentTypePreview,
  FormInstallPreview,
  InstallChoices,
  ProgramKeyPreview,
} from './formInstall';

type UploadedPluginInfo =
  UploadedPluginInfoQuery['centralServer']['plugin']['uploadedPluginInfo'];

interface PluginUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  install: (
    variables: InstallUploadedPluginMutationVariables
  ) => Promise<unknown>;
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
  fileId: string;
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
  ): Promise<boolean> => {
    try {
      await install(variables);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error(`${t('error.unable-to-install-plugin')}: ${message}`)();
      return false;
    }
  };

  // Upload and read each file in turn. A bundle carrying a form plugin is
  // held for its choices, the files after it waiting; anything else — no
  // form plugin, or a file the read could not parse — installs at once, as
  // before, so a non-bundle is still refused by the install with the
  // server's own words.
  const run = async (queue: File[]) => {
    for (const [i, file] of queue.entries()) {
      const fileId = await upload(file);
      if (!fileId) return;
      const read = previewOf(await preview(fileId).catch(() => undefined));
      if (read && needsChoices(read)) {
        setHeld({ file, fileId, preview: read });
        setChoices(initialChoices(read));
        setFiles(queue.slice(i));
        return;
      }
      if (!(await installOne({ fileId }))) return;
    }
    success(t('messages.plugin-uploaded-successfully'))();
    onClose();
  };

  const onOk = async () => {
    if (busy || !files.length) return;
    setBusy(true);
    try {
      if (held) {
        // A refusal keeps the held bundle and every choice for a retry.
        if (!(await installOne(installVariables(held.fileId, choices)))) return;
        const rest = files.filter(f => f !== held.file);
        discard();
        setFiles(rest);
        await run(rest);
      } else {
        await run(files);
      }
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
            onTakeOver={(type, on) =>
              setChoices(current => withTakeOver(current, type, on))
            }
            onBlankOldUi={(type, on) =>
              setChoices(current => withBlankOldUi(current, type, on))
            }
          />
        )}
      </DetailContainer>
    </Modal>
  );
};

/*
 * The form-plugin step, as the Solid front end's: per plugin, a program
 * select for each of its program keys; then each take-over to confirm and
 * each blanking to acknowledge, as checkboxes that start off; and, first, any
 * type the install will refuse whatever is chosen.
 */
const FormPluginChoices = ({
  preview,
  choices,
  disabled,
  onProgram,
  onTakeOver,
  onBlankOldUi,
}: {
  preview: FormInstallPreview;
  choices: InstallChoices;
  disabled: boolean;
  onProgram: (programKey: string, programId: string) => void;
  onTakeOver: (documentType: string, confirmed: boolean) => void;
  onBlankOldUi: (documentType: string, acknowledged: boolean) => void;
}) => {
  const t = useTranslation();
  const options = programOptions(preview.programs);

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

  const refusedText = (type: DocumentTypePreview): string =>
    type.existingEntry === ExistingRegistryEntryNode.OwnedByAnotherPlugin
      ? t('error.form-plugin-type-owned', {
          documentType: type.documentType,
          owner: type.existingEntryOwner ?? '',
        })
      : t('error.form-plugin-type-ambiguous', {
          documentType: type.documentType,
        });

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
              data-testid={`upload-plugin-program-${key.programKey}`}
            >
              <Select
                label={key.programKey}
                required
                fullWidth
                options={options}
                value={choices.programs[key.programKey] ?? ''}
                onChange={e => onProgram(key.programKey, e.target.value)}
                helperText={keyHelper(key)}
                disabled={disabled}
              />
            </Box>
          ))}
        </Box>
      ))}
      {takeOverCandidates(preview).map(type => (
        <Box key={type.documentType}>
          <FormControlLabel
            control={
              <Checkbox
                checked={choices.takeOver.includes(type.documentType)}
                onChange={(_, on) => onTakeOver(type.documentType, on)}
                disabled={disabled}
                testId={`upload-plugin-take-over-${type.documentType}`}
              />
            }
            label={t('label.take-over-entry', {
              documentType: type.documentType,
            })}
          />
          <Typography variant="caption" color="text.secondary" component="p">
            {t('messages.take-over-entry', {
              documentType: type.documentType,
              id: type.existingEntryId ?? '',
            })}
          </Typography>
        </Box>
      ))}
      {blankOldUiCandidates(preview).map(type => (
        <Box key={type.documentType}>
          <FormControlLabel
            control={
              <Checkbox
                checked={choices.blankOldUi.includes(type.documentType)}
                onChange={(_, on) => onBlankOldUi(type.documentType, on)}
                disabled={disabled}
                testId={`upload-plugin-blank-old-ui-${type.documentType}`}
              />
            }
            label={t('label.blank-old-ui', { documentType: type.documentType })}
          />
          <Typography variant="caption" color="text.secondary" component="p">
            {t('messages.blank-old-ui', { documentType: type.documentType })}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};
