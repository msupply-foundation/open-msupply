// Pure logic for the help vertical (spec/help). Colocated + pure so the
// send-gating, email check, user-guide localisation, and the documents-block
// visibility rule are unit-tested (OMS-REG-HLP-01.17/.18/.19/.2-.7/.23)
// without the screens.

const DOCS_BASE = 'https://docs.msupply.foundation';

// The public user guide's introduction, localised where a translated docs site
// exists — es / fr (+ fr-DJ) / pt, default otherwise (OMS-REG-HLP-01.17 —
// the case's es/fr; pt is implemented ahead of the spec, a candidate
// refinement, see BUILD_REPORT.md). Grounded in the real client's
// useExternalUrl (client/packages/config/src/routes.ts): the base gains a
// language segment, then `/docs/introduction/introduction`.
export const userGuideUrl = (language: string): string => {
  const langPath =
    language === 'es'
      ? '/es'
      : language === 'fr' || language === 'fr-DJ'
        ? '/fr'
        : language === 'pt'
          ? '/pt'
          : '';
  return `${DOCS_BASE}${langPath}/docs/introduction/introduction`;
};

// Client-side email format check (OMS-REG-HLP-01.23). The server's guard is
// the loose [^@]+@[^@]+\.[^@]+ (contract › contact form); the client's own
// check is a standard single-address shape. The server remains the
// enforcement (OMS-REG-HLP-01.24).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (email: string): boolean =>
  EMAIL_RE.test(email.trim());

// Send is enabled exactly when the email passes the client check AND the message
// is non-empty; it disables again whenever either stops holding (OMS-REG-HLP-01.2-.7).
export const canSendContactForm = (email: string, message: string): boolean =>
  isValidEmail(email) && message.trim().length > 0;

// A document is showable on the Help page only if it carries a file; the whole
// block hides when none are showable (OMS-REG-HLP-01.18/.19). Presence of a
// file row — not its sync status — is the only availability signal (contract;
// OMS-REG-HLP-01.22). The server already returns newest-first, so order is
// preserved.
export const showableDocuments = <
  T extends { files?: { nodes: unknown[] } | null },
>(
  docs: T[]
): T[] => docs.filter(d => (d.files?.nodes.length ?? 0) > 0);

// The inline-view URL for a document's file (OMS-REG-HLP-01.20): opened in a
// new tab; the server streams it inline under its original name, or 404s with
// the not-synced message on a site without the bytes (OMS-REG-HLP-01.22).
// `base` is the server's sync-files origin.
export const helpDocumentFileUrl = (
  base: string,
  documentId: string,
  fileId: string
): string => `${base}/sync_files/help_document/${documentId}/${fileId}`;
