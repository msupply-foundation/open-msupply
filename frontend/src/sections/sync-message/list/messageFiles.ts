import type {
  SyncMessageFileFragment,
  SyncMessageRowFragment,
} from './syncMessages.generated';

/*
 * Inspecting one message (spec/sync-message/rules.md § attached files,
 * § lifecycle; ui-surface S3). Pure display logic, kept out of the modal so
 * the anchor-citing tests exercise it directly
 * (OMS-REG-MNG-04 .19–.24).
 */

/** The table the attached files are recorded against — the sync-file
 *  endpoint's first path segment (contract § attached files). */
export const SYNC_MESSAGE_TABLE = 'sync_message';

/**
 * Whether a kind produces artefacts at all. Only a support upload does; the
 * other two kinds never have files.
 *
 * ⚠️ This gate cannot be replaced by looking at `files`: the resolver wraps
 * whatever the loader returns in `Some(...)`, so a requestFieldChange or other
 * message still answers with a connector of totalCount 0 rather than null
 * (contract ⚠️ wire trap — `files` is never null). A present `files` is
 * therefore no evidence that the message HAS an artefact surface.
 */
export const producesArtefacts = (type: SyncMessageRowFragment['type']) =>
  type === 'supportUpload';

/**
 * Whether the message modal shows a Files section at all
 * (OMS-REG-MNG-04.20): only for a kind that produces artefacts AND only when
 * at least one file exists. A message that produced none shows NO section
 * rather than an empty one — the section's presence is itself the signal that
 * artefacts exist.
 */
export const showFilesSection = (
  type: SyncMessageRowFragment['type'],
  files: SyncMessageFileFragment[]
): boolean => producesArtefacts(type) && files.length > 0;

/**
 * The files in display order: file NAME ascending, so a log file and its
 * rotated history read as a sequence (rules § attached files,
 * OMS-REG-MNG-04.19). The server's loader already sorts this way; sorting a
 * copy here makes the order the screen's own guarantee rather than an
 * assumption about the read, and costs nothing at this row count.
 */
export const filesInNameOrder = (
  files: SyncMessageFileFragment[]
): SyncMessageFileFragment[] =>
  [...files].sort((a, b) => a.fileName.localeCompare(b.fileName));

/**
 * The message's own recorded failure reason, shown as an error notice
 * (OMS-REG-MNG-04.21) — only when the status IS Error and a reason was
 * recorded. The string is a raw, developer-facing server string, shown
 * verbatim and never translated (contract § lifecycle).
 */
export const messageErrorNotice = (
  message: Pick<SyncMessageRowFragment, 'status' | 'errorMessage'>
): string | undefined =>
  message.status === 'error' && message.errorMessage
    ? message.errorMessage
    : undefined;

/**
 * A per-artefact failure is NOT a message failure (OMS-REG-MNG-04.23): the
 * file carries its own reason, the message stays Processed, and the file list
 * is the only place the failure is visible. So this reads the FILE's own
 * `error` and nothing about the message's status.
 */
export const fileErrorNotice = (
  file: Pick<SyncMessageFileFragment, 'error'>
): string | undefined => file.error ?? undefined;
