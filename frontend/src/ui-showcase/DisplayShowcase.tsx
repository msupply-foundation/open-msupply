import { createSignal } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { WidgetCard } from '../ui/elements/display/WidgetCard';
import { DocumentFrame } from '../ui/elements/display/DocumentFrame';
import { StatComparisonTile } from '../ui/elements/display/StatComparisonTile';
import { QrCode } from '../ui/elements/display/QrCode';
import { NumberField } from '../ui/elements/inputs/NumberField';
import { TextField } from '../ui/elements/inputs/TextField';
import { ReportsIcon, StockIcon, TruckIcon, PrinterIcon } from '../ui/icons';
import { Lead, Note, SectionTOC } from './common';
import type { PageMetadata } from './metadata';
import styles from './DisplayShowcase.module.css';

/* A small self-contained HTML document (no scripts) to show the sandboxed
   frame rendering server-style report output. */
const REPORT_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { font-family: system-ui, sans-serif; color: #1c1c28; margin: 1.5rem; }
  h1 { font-size: 1.1rem; } table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #eaeaea; padding: 6px 10px; text-align: left; font-size: 13px; }
  th { background: #fafafc; }
</style></head><body>
  <h1>Stock on hand — General store</h1>
  <table><thead><tr><th>Item</th><th>Batch</th><th>SOH</th></tr></thead>
  <tbody>
    <tr><td>Amoxicillin 500mg</td><td>B2487-594</td><td>1,240</td></tr>
    <tr><td>Paracetamol 500mg</td><td>P1120-003</td><td>8,600</td></tr>
    <tr><td>ORS sachets</td><td>O0098-771</td><td>430</td></tr>
  </tbody></table>
</body></html>`;

/*
 * Storybook of the display elements — the dashboard/report surfaces the reports
 * vertical needs: WidgetCard (a whole-card link/button) and DocumentFrame (a
 * sandboxed iframe for server-rendered HTML documents).
 */
export const displayMetadata: PageMetadata = {
  id: 'display',
  title: 'Display',
  searchTerms: ['tile', 'card', 'output'],
  items: [
    {
      id: 'display-stat-comparison',
      title: 'Stat comparison tile',
      searchTerms: ['before', 'after', 'adjusted', 'preview'],
    },
    {
      id: 'display-widget-card',
      title: 'Widget card',
      searchTerms: ['clickable', 'dashboard', 'link'],
    },
    {
      id: 'display-document-frame',
      title: 'Document frame',
      searchTerms: ['iframe', 'report', 'sandbox', 'print'],
    },
    {
      id: 'display-qr-code',
      title: 'QR code',
      searchTerms: ['qr', 'server', 'url', 'scan', 'pair', 'encode'],
    },
  ],
};

export const DisplayShowcase = () => {
  const [lastClicked, setLastClicked] = createSignal('');
  // Stat-comparison-tile demo: a live "adjust by N" input drives the preview.
  const CURRENT_PACKS = 120;
  const [adjustBy, setAdjustBy] = createSignal<number | undefined>();
  const adjusted = () =>
    adjustBy() === undefined
      ? undefined
      : String(CURRENT_PACKS - (adjustBy() ?? 0));
  // QR demo: a live value drives the encoded symbol. A real, reachable URL so
  // scanning it with a phone lands somewhere useful rather than a dead link.
  const [qrValue, setQrValue] = createSignal('https://msupply.foundation');
  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <SectionTOC page={displayMetadata} />
        <DashboardCard
          id="display-stat-comparison"
          title="Stat comparison tile — current → adjusted preview"
        >
          <Lead>
            A labelled tile showing a value beside its adjusted/preview
            counterpart (the stock adjustment modal's Available packs / Packs on
            hand). The preview side is{' '}
            <strong>blank until there is an input</strong>. An optional sub-note
            carries secondary context (e.g. the dose equivalent).
          </Lead>
          <div style={{ 'max-width': '18rem', 'margin-bottom': '1rem' }}>
            <NumberField
              label="Reduce packs by"
              value={adjustBy()}
              onChange={setAdjustBy}
            />
          </div>
          <div class={styles.grid}>
            <StatComparisonTile
              label="Available packs"
              current={String(CURRENT_PACKS)}
              adjusted={adjusted()}
            />
            <StatComparisonTile
              label="Packs on hand"
              current={String(CURRENT_PACKS)}
              currentNote="6,000 doses"
              adjusted={adjusted()}
              adjustedNote={
                adjusted() === undefined
                  ? undefined
                  : `${Number(adjusted()) * 50} doses`
              }
            />
          </div>
        </DashboardCard>
        <DashboardCard
          id="display-widget-card"
          title="Widget card — clickable dashboard tile"
        >
          <Lead>
            A titled card where the <strong>whole surface</strong> is one
            interactive element — an <code>&lt;a href&gt;</code> (router
            navigation) or a <code>&lt;button&gt;</code> (<code>onClick</code>).
            One focusable control, the title as its accessible name, the icon
            decorative. Hover lifts it; keyboard focus shows the ring. Lay them
            in an intrinsic grid for a dashboard.
          </Lead>
          <div class={styles.grid}>
            <WidgetCard
              title="Reports"
              subtitle="Generate and print"
              icon={<ReportsIcon />}
              onClick={() => setLastClicked('Reports')}
            />
            <WidgetCard
              title="Stock on hand"
              subtitle="Current inventory"
              icon={<StockIcon />}
              onClick={() => setLastClicked('Stock on hand')}
            />
            <WidgetCard
              title="Distribution"
              subtitle="Outbound shipments"
              icon={<TruckIcon />}
              onClick={() => setLastClicked('Distribution')}
            />
            <WidgetCard
              title="Print queue"
              subtitle="This one is a link (href)"
              icon={<PrinterIcon />}
              href="#/showcase/icons"
            />
          </div>
          <Note role="status">
            {lastClicked() ? `Clicked: ${lastClicked()}` : '\u00a0'}
          </Note>
        </DashboardCard>

        <DashboardCard
          id="display-document-frame"
          title="Document frame — sandboxed report output"
        >
          <Lead>
            A sandboxed <code>&lt;iframe&gt;</code> for server-rendered HTML
            documents. Fills its container, shows a centred Spinner until the
            load event, and sandboxes to <code>allow-same-origin</code> by
            default (the document may load same-origin images but runs no
            scripts). This one is driven by <code>srcdoc</code>.
          </Lead>
          <div class={styles.frameHolder}>
            <DocumentFrame title="Stock on hand report" srcdoc={REPORT_HTML} />
          </div>
        </DashboardCard>

        <DashboardCard id="display-qr-code" title="QR code — encode a URL">
          <Lead>
            A QR symbol rendered as a self-contained <code>&lt;svg&gt;</code>{' '}
            over a <strong>vendored, dependency-free encoder</strong> — the
            Solid analogue of the reference app's <code>react-qr-code</code>. It
            picks the smallest version that fits and scales crisply to any{' '}
            <code>size</code>. A QR is always used to scan/pair, so the inline
            50px symbol is <strong>click-to-expand</strong>: clicking it pops
            the enlarged copy. Edit the value below and watch the symbol
            re-encode.
          </Lead>
          <div style={{ 'max-width': '25rem', 'margin-bottom': '1rem' }}>
            <TextField
              label="Encoded value"
              value={qrValue()}
              onInput={e => setQrValue(e.currentTarget.value)}
            />
          </div>
          <div class={styles.qrItem}>
            <span class={styles.qrCaption}>Click to enlarge</span>
            <QrCode value={qrValue()} title="QR code for the encoded value" />
          </div>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};
