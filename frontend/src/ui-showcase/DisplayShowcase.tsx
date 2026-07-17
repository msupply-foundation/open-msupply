import { createSignal, type JSX } from 'solid-js';
import { WidgetCard } from '../ui/elements/display/WidgetCard';
import { DocumentFrame } from '../ui/elements/display/DocumentFrame';
import { ReportsIcon, StockIcon, TruckIcon, PrinterIcon } from '../ui/icons';
import styles from './DisplayShowcase.module.css';

const Card = (props: {
  title: string;
  lead: JSX.Element;
  children: JSX.Element;
}) => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>{props.title}</header>
    <div class={styles.cardBody}>
      <p class={styles.lead}>{props.lead}</p>
      {props.children}
    </div>
  </section>
);

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
export const DisplayShowcase = () => {
  const [lastClicked, setLastClicked] = createSignal('');
  return (
    <div class={styles.stack}>
      <Card
        title="Widget card — clickable dashboard tile"
        lead={
          <>
            A titled card where the <strong>whole surface</strong> is one
            interactive element — an <code>&lt;a href&gt;</code> (router
            navigation) or a <code>&lt;button&gt;</code> (<code>onClick</code>).
            One focusable control, the title as its accessible name, the icon
            decorative. Hover lifts it; keyboard focus shows the ring. Lay them
            in an intrinsic grid for a dashboard.
          </>
        }
      >
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
        <p class={styles.lead} role="status">
          {lastClicked() ? `Clicked: ${lastClicked()}` : '\u00a0'}
        </p>
      </Card>

      <Card
        title="Document frame — sandboxed report output"
        lead={
          <>
            A sandboxed <code>&lt;iframe&gt;</code> for server-rendered HTML
            documents. Fills its container, shows a centred Spinner until the
            load event, and sandboxes to <code>allow-same-origin</code> by
            default (the document may load same-origin images but runs no
            scripts). This one is driven by <code>srcdoc</code>.
          </>
        }
      >
        <div class={styles.frameHolder}>
          <DocumentFrame title="Stock on hand report" srcdoc={REPORT_HTML} />
        </div>
      </Card>
    </div>
  );
};
