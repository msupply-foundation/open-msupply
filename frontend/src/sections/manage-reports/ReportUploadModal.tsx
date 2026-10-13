import { createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t, formatFileSize } from '@/intl';
import { translateServerError } from '@/intl/intlUtils';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Stack } from '@/ui/layout/Stack/Stack';
import { UploadZone } from '@/ui/elements/inputs/UploadZone';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton, OkButton } from '@/ui/elements/buttons/StandardButtons';
import { InstallUploadedReports } from './manageReports.generated';
import {
  addToBatch,
  batchInstalledNothing,
  emptyBatch,
  installOutcome,
  judgePick,
  uploadReportFile,
  MAX_BUNDLE_BYTES,
  type BatchOutcome,
} from './reportInstall';

// The report-bundle installer — spec/manage-reports S2.
//
// Installing is TWO steps per file and both must succeed before anything is
// reported as installed (OMS-REG-MNG-06.23): the file is transferred over REST
// to learn its id, then that id is installed over GraphQL. Files are handled
// INDEPENDENTLY, so an earlier file's reports stay installed when a later one
// fails (OMS-REG-MNG-06.16).
//
// What the dialog does NOT do, deliberately: warn that installing replaces a
// version already present. Nothing on the wire can opt out of the overwrite
// and the reference app offers no confirmation, so inventing one here would be
// a deliberate difference rather than a reverse spec (rules.md § replacement,
// OMS-REG-MNG-06.10).

export interface ReportUploadModalProps {
  onClose: () => void;
  /** At least one report installed: the owner refreshes the register. */
  onInstalled: () => void;
}

export const ReportUploadModal: Component<ReportUploadModalProps> = props => {
  const [files, setFiles] = createSignal<File[]>([]);
  const [installing, setInstalling] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>(undefined);

  const removeFile = (name: string) =>
    setFiles(files().filter(file => file.name !== name));

  // The reference app's own type check, reproduced exactly: a name ending in
  // "json" passes, extension or not.
  //
  // Deliberately LENIENT, and it stays that way. The check is advisory — the
  // server is the real guard, because it validates by parsing (rules.md §
  // rejections) — and an advisory check in front of a real guard must fail
  // permissively: a true extension or MIME test would reject files that
  // install successfully today (a bundle saved without an extension, a
  // `.geojson` name, anything whose browser-reported MIME is not
  // application/json). Tightening it removes working installs, it does not add
  // safety.
  //
  // This is why `UploadZone` carries no `accept` list: its matching is
  // extension-or-MIME and cannot express "name ends with json".
  //
  // Size is the zone's job, though, and is a real server limit rather than an
  // advisory one: `/upload` registers no MultipartFormConfig, so actix's
  // default 50 MiB total applies and a larger body is refused with a bare 400
  // naming neither the size nor the file (contract.md § choosing the files).
  // Refusing it here is a DELIBERATE difference from the reference, which
  // sends it and reports that bare failure (OMS-REG-MNG-06.27).

  const install = async () => {
    if (installing() || files().length === 0) return; // re-entry guard
    setInstalling(true);
    setError(undefined);

    // Files are taken IN ORDER and the first failure ENDS the attempt: the
    // rest are neither transferred nor installed (rules.md § several files at
    // once, OMS-REG-MNG-06.24). Everything installed before it stays
    // installed, and the register has already picked each one up.
    let batch: BatchOutcome = emptyBatch();
    let rejection: string | undefined;

    for (const file of files()) {
      const uploaded = await uploadReportFile(file);
      if (uploaded.kind === 'failed') {
        batch = addToBatch(batch, file.name, { kind: 'failed' });
        rejection = uploaded.message;
        break;
      }
      // returnGraphqlErrors: every install rejection is UNTYPED, so without it
      // a plain bad file would trip the global unexpected-error modal instead
      // of being reported here (contract.md § rejections).
      const result = await graphqlFetch(
        InstallUploadedReports,
        { fileId: uploaded.fileId },
        { returnGraphqlErrors: true }
      );
      const outcome = installOutcome(result);
      batch = addToBatch(batch, file.name, outcome);
      if (outcome.kind !== 'installed') {
        if (outcome.kind === 'rejected') rejection = outcome.serverError;
        break;
      }
    }

    setInstalling(false);

    if (batch.failedFiles.length > 0) {
      // The attempt failed. Whatever installed before it stays installed, so
      // the register is refreshed either way; the dialog stays OPEN with the
      // chosen files untouched, ready to correct and retry
      // (OMS-REG-MNG-06.25).
      if (!batchInstalledNothing(batch)) props.onInstalled();
      // The server's own words, appended to the generic message — nothing
      // names which file failed, because the server does not say
      // (OMS-REG-MNG-06.26).
      setError(
        rejection
          ? `${t('error.unable-to-upload-reports')}: ${translateServerError(rejection)}`
          : t('error.unable-to-upload-reports')
      );
      return;
    }

    // Every file installed. Closing plus the refreshed register IS the
    // confirmation — no announcement follows (ui-standards controls.md
    // § action feedback).
    props.onInstalled();
  };

  return (
    <Dialog
      open
      testId="report-upload-modal"
      title={t('title.upload-reports')}
      dismissable={!installing()}
      onClose={props.onClose}
      width="prose"
      actionsLead={
        <Show when={error()}>
          <Alert severity="error" testId="report-upload-error">
            {error()}
          </Alert>
        </Show>
      }
      actions={
        <>
          <Show when={!installing()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          {/* OK, matching the reference app's confirm affordance for this
              dialog. Inert until at least one file is chosen. */}
          <OkButton
            data-testid="dialog-button-ok"
            disabled={files().length === 0}
            loading={installing()}
            onClick={() => void install()}
          />
        </>
      }
    >
      <Stack>
        <p>{t('messages.report-upload-helper')}</p>
        <UploadZone
          multiple
          maxSize={MAX_BUNDLE_BYTES}
          disabled={installing()}
          inputTestId="report-upload-input"
          onPick={(accepted, rejected) => {
            // One judgement per pick: a bad name refuses all of it, an
            // oversized file is refused on its own while the rest is taken,
            // and what is taken replaces the files already chosen
            // (OMS-REG-MNG-06.27, .29, .33, .34). Only 'size' can be rejected
            // by the zone — no `accept` list is set.
            const pick = judgePick(accepted, rejected);
            if (pick.kind === 'empty') return;
            if (pick.kind === 'invalidName') {
              setError(t('error.report-invalid-file'));
              return;
            }
            const tooLarge =
              pick.kind === 'tooLarge' ? pick.fileName : pick.tooLarge;
            setError(
              tooLarge
                ? t('error.file-exceeds-size-limit', {
                    filename: tooLarge,
                    maxSize: formatFileSize(MAX_BUNDLE_BYTES),
                  })
                : undefined
            );
            if (pick.kind === 'accepted') setFiles(pick.files);
          }}
        />
        {/* The chosen files, each removable before confirming. */}
        <Show when={files().length > 0}>
          <ul data-testid="report-upload-file-list">
            <For each={files()}>
              {file => (
                <li>
                  <span>{file.name}</span>
                  <Button
                    variant="ghost"
                    disabled={installing()}
                    data-testid={`report-upload-remove-${file.name}`}
                    onClick={() => removeFile(file.name)}
                  >
                    {t('button.remove-file')}
                  </Button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Stack>
    </Dialog>
  );
};
