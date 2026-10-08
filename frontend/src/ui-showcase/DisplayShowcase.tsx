import { createSignal } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { CardGrid } from '../ui/layout/CardGrid/CardGrid';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { WidgetCard } from '../ui/elements/display/WidgetCard';
import { DocumentFrame } from '../ui/elements/display/DocumentFrame';
import { StatComparisonTile } from '../ui/elements/display/StatComparisonTile';
import { QrCode } from '../ui/elements/display/QrCode';
import { Timeline, TimelineItem } from '../ui/elements/display/Timeline';
import { DetailCard } from '../ui/layout/Detail/DetailCard';
import { LabelledValue } from '../ui/elements/typography/LabelledValue';
import { StatusChip } from '../ui/elements/feedback/StatusChip';
import { NumberField } from '../ui/elements/inputs/NumberField';
import { TextField } from '../ui/elements/inputs/TextField';
import {
  ReportsIcon,
  SettingsIcon,
  StockIcon,
  TruckIcon,
  PrinterIcon,
  UserIcon,
} from '../ui/icons';
import { Lead, Note, Row, SectionTOC } from './common';
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
      id: 'display-labelled-value',
      title: 'Labelled value',
      searchTerms: ['label', 'read-only', 'field', 'detail', 'key value'],
    },
    {
      id: 'display-stat-comparison',
      title: 'Stat comparison tile',
      searchTerms: ['before', 'after', 'adjusted', 'preview'],
    },
    {
      id: 'display-widget-card',
      title: 'Widget card',
      searchTerms: ['clickable', 'dashboard', 'link', 'tile', 'kpi', 'slot'],
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
    {
      id: 'display-timeline',
      title: 'Timeline',
      searchTerms: ['history', 'rail', 'events', 'log', 'status history'],
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
          id="display-labelled-value"
          title="Labelled value — read-only label-above-value"
        >
          <Lead>
            A read-only label-above-value pair — the field unit in cards, in
            detail and side panels, and (as <code>variant="field"</code>) a
            read-only fact sitting flush among editable inputs in a form.
            Stacked (label on top), so a row of them <strong>wraps</strong>{' '}
            intrinsically rather than forcing a fixed grid. The value is any
            node — text, a number, or a status chip.
          </Lead>
          <Row align="start">
            <LabelledValue label="Store">General store</LabelledValue>
            <LabelledValue label="Created">12/03/2026</LabelledValue>
            <LabelledValue label="Status">
              <StatusChip label="Finalised" colour="var(--status-finalised)" />
            </LabelledValue>
          </Row>
          <Note>
            <code>variant="field"</code> matches an input's label→control gap,
            so a read-only fact lines up beside editable fields — read-only
            reads from the <em>absent input box</em>, not the label:
          </Note>
          <Row align="start">
            <LabelledValue variant="field" label="Pack size">
              50
            </LabelledValue>
            <TextField label="Batch" value="B2487-594" />
            <LabelledValue variant="field" label="Available packs">
              530
            </LabelledValue>
          </Row>
          <Note>
            <code>size="small"</code> drops to the small-input scale — for a
            value riding a page-header toolbar row beside small controls:
          </Note>
          <Row align="start" gap="sm">
            <LabelledValue size="small" label="On hand">
              1,240
            </LabelledValue>
            <LabelledValue size="small" label="Expires">
              06/2027
            </LabelledValue>
          </Row>
        </DashboardCard>
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
          <CardGrid minColumnWidth="16rem">
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
          </CardGrid>
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
          <CardGrid minColumnWidth="16rem">
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
          </CardGrid>
          <Lead>
            The optional <strong>content slot</strong> renders full-width after
            the icon + title/subtitle header — the place for a task tile's KPI
            figures. The card stays one interactive element, so slot content
            must be non-interactive (no links or buttons inside; dev builds
            warn). Slot text is the control's accessible{' '}
            <strong>description</strong>, not part of its name — a live figure
            never renames the card. A figure of <code>0</code> still renders.
          </Lead>
          <CardGrid minColumnWidth="16rem">
            <WidgetCard
              title="Internal orders"
              subtitle="Awaiting approval"
              icon={<TruckIcon />}
              onClick={() => setLastClicked('Internal orders')}
            >
              <span class={styles.figure}>7</span>
            </WidgetCard>
            <WidgetCard
              title="Stocktakes"
              subtitle="Lines to count"
              icon={<StockIcon />}
              onClick={() => setLastClicked('Stocktakes')}
            >
              <span class={styles.figure}>0</span>
            </WidgetCard>
          </CardGrid>
          <Lead>
            When something <strong>stretches</strong> a card past its content —
            a grid row sized to the tallest, or a card spanning two rows —{' '}
            <code>contentPlacement</code> decides where the slot goes. The
            default <code>spread</code> pushes it to the bottom edge, which is
            what puts a row&rsquo;s figures on a shared baseline. Use{' '}
            <code>grouped</code> for a card with no row-mates to line up with:
            spreading has nothing to align to there and only opens a gap between
            the label and the figure. Both cards below are stretched to the same
            height by the row.
          </Lead>
          <div class={styles.stretchedRow}>
            <WidgetCard
              title="Spread"
              subtitle="Figure at the bottom edge"
              icon={<StockIcon />}
              onClick={() => setLastClicked('Spread')}
            >
              <span class={styles.figure}>1284</span>
            </WidgetCard>
            <WidgetCard
              title="Grouped"
              subtitle="Figure stays with the header"
              icon={<StockIcon />}
              contentPlacement="grouped"
              onClick={() => setLastClicked('Grouped')}
            >
              <span class={styles.figure}>1284</span>
            </WidgetCard>
            <WidgetCard
              title="Taller neighbour"
              subtitle="Sets the row's height, so the two cards beside it are stretched and the difference shows"
              icon={<ReportsIcon />}
              onClick={() => setLastClicked('Taller neighbour')}
            >
              <span class={styles.figure}>1284</span>
            </WidgetCard>
          </div>
          <Note role="status">
            {lastClicked() ? `Clicked: ${lastClicked()}` : '\u00a0'}
          </Note>
        </DashboardCard>

        <DashboardCard
          id="display-widget-card-size"
          title="Widget card — the card that leads a grid"
        >
          <Lead>
            <code>size="lg"</code> enlarges the icon chip and the title for the
            one card a screen leads with — where matching its neighbours&rsquo;
            type makes the primary task read as a peer. The title goes to{' '}
            <code>--text-lg</code>, deliberately below the slot figure&rsquo;s{' '}
            <code>--text-xl</code>, so it does not compete with the number it
            introduces. Emphasis only: nothing about the card&rsquo;s semantics
            changes. Every card also carries a decorative go-arrow at its
            trailing top corner — the standing affordance that activating it
            leads somewhere, never announced and never a control of its own.
          </Lead>
          <div class={styles.stretchedRow}>
            <WidgetCard
              title="Default"
              subtitle="One of the grid"
              icon={<StockIcon />}
              onClick={() => setLastClicked('Default size')}
            >
              <span class={styles.figure}>128</span>
            </WidgetCard>
            <WidgetCard
              title="Leads the grid"
              subtitle="Given more room than its neighbours"
              icon={<StockIcon />}
              size="lg"
              onClick={() => setLastClicked('Large size')}
            >
              <span class={styles.figure}>128</span>
            </WidgetCard>
          </div>
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
            scripts). A document that must run its own scripts takes{' '}
            <code>allow-scripts</code> <em>instead</em> — the reports view's
            does — so the two never combine into a frame that can reach the app.
            This one is driven by <code>srcdoc</code>.
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

        <DashboardCard
          id="display-timeline"
          title="Timeline — a record's history on a rail"
        >
          <Lead>
            Past events, each already happened, joined top to bottom by a
            connector. The marker's glyph says <strong>who or what</strong>{' '}
            recorded the entry; it is decoration, so a screen reader hears only
            the entry's own content. Each entry brings whatever it likes beside
            the rail — here a bordered detail card.
          </Lead>
          <Note>
            Not the determinate progress list, which shares the picture and
            nothing else: that one models a multi-phase <em>operation</em> and
            derives everything from progression. A history has no current step —
            every row is a past fact.
          </Note>
          <Timeline>
            <TimelineItem icon={<UserIcon />}>
              <DetailCard
                surface="bordered"
                title="24 June 2026"
                actions={<StatusChip label="Functioning" colour="var(--success-main)" />}
              >
                <Stack gap="sm">
                  <LabelledValue label="User">gburns</LabelledValue>
                  <LabelledValue label="Observations">
                    Back in service after the compressor swap.
                  </LabelledValue>
                </Stack>
              </DetailCard>
            </TimelineItem>
            <TimelineItem icon={<SettingsIcon />}>
              <DetailCard surface="bordered" title="2 June 2026">
                <LabelledValue label="Observations">
                  Recorded by the server when the register was imported.
                </LabelledValue>
              </DetailCard>
            </TimelineItem>
          </Timeline>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};
