import { createSignal, createUniqueId } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import {
  DocumentUploadPanel,
  type DocumentFile,
} from '../ui/elements/display/DocumentUploadPanel';
import { Lead } from './common';
import styles from './DocumentUploadShowcase.module.css';

// The mockup's sample documents (filename, uploaded date, size).
const INITIAL_DOCUMENTS: DocumentFile[] = [
  {
    id: 'doc-1',
    fileName: 'Delivery-note-GN-2026-0412.pdf',
    createdDatetime: '2026-06-24',
    totalBytes: Math.round(1.2 * 1024 * 1024),
    url: '#',
  },
  {
    id: 'doc-2',
    fileName: 'Waybill-scan-photo.jpg',
    createdDatetime: '2026-06-24',
    totalBytes: Math.round(3.4 * 1024 * 1024),
    url: '#',
  },
  {
    id: 'doc-3',
    fileName: 'Supplier-invoice-April.xlsx',
    createdDatetime: '2026-06-18',
    totalBytes: 480 * 1024,
    url: '#',
  },
];

/*
 * Storybook of the DocumentUploadPanel — the generic "Documents" surface used
 * by record detail views (inbound shipments, requisitions, purchase orders):
 * a drag & drop upload zone above a plain file list with per-row delete. Fully
 * interactive here (uploads append, deletes remove) against local state; a real
 * detail view wires the same callbacks to the sync_files endpoint.
 */
export const DocumentUploadShowcase = () => {
  const [documents, setDocuments] = createSignal<DocumentFile[]>([
    ...INITIAL_DOCUMENTS,
  ]);

  const onUpload = (files: File[]) =>
    setDocuments(prev => [
      ...files.map(file => ({
        id: createUniqueId(),
        fileName: file.name,
        createdDatetime: new Date().toISOString(),
        totalBytes: file.size,
        url: '#',
      })),
      ...prev,
    ]);

  const onDelete = (document: DocumentFile) =>
    setDocuments(prev => prev.filter(doc => doc.id !== document.id));

  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <DashboardCard title="Document upload — the whole Documents tab">
          <Lead>
            A drag & drop upload zone above a plain file list — file-type icon,
            name link, date uploaded, size, per-row delete. Not a table: a
            semantic <code>&lt;ul&gt;</code> on a shared grid. Presentational
            and callback-driven (<code>onUpload</code> / <code>onDelete</code>);
            the caller owns the transport. Try dropping a file, or delete a row.
          </Lead>
          <div class={styles.frame}>
            <DocumentUploadPanel
              documents={documents()}
              onUpload={onUpload}
              onDelete={onDelete}
            />
          </div>
        </DashboardCard>

        <DashboardCard title="Read-only — no upload zone, no delete">
          <Lead>
            Omit <code>onUpload</code> (or set <code>canUpload=false</code>) to
            hide the zone, and <code>onDelete</code> to drop the delete action —
            e.g. a finalised record.
          </Lead>
          <div class={styles.frame}>
            <DocumentUploadPanel documents={INITIAL_DOCUMENTS} />
          </div>
        </DashboardCard>

        <DashboardCard title="Empty state">
          <Lead>No documents yet — the zone invites the first upload.</Lead>
          <div class={styles.frame}>
            <DocumentUploadPanel documents={[]} onUpload={() => {}} />
          </div>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};
