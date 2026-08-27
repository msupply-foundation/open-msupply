/*
 * ═══════════════════════════════════════════════════════════════════════
 * Cook Islands Home Navigator — a LAYOUT preview, not a proposal.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Unusually for this folder, the thing on show here is already built and
 * agreed: CK-2.3's layout shell, in the plugin, specified by
 * plugins/cook_islands/ui-surface.md § S1. What is NOT built is everything
 * inside it — the task tiles' KPI blocks and the Stock Management strip are
 * CK-2.2's, and the figures that fill them are CK-3.x.
 *
 * The shell is deliberately ignorant of all of that, which is what lets those
 * tickets land in any order — but it also means the shell cannot be LOOKED at
 * on its own, and its one real open question is visual: how the hero and the
 * two-by-two block share a row, when they should wrap, and whether the strip
 * holds its height on a landscape tablet. So the stand-ins below exist to give
 * the grid something with realistic bulk to place, and they are thrown away the
 * moment CK-2.2 lands.
 *
 * Read what follows as: the GRID is real, everything inside a tile is scenery.
 *
 * The one import that crosses into the plugin is NavigatorGrid itself, which is
 * safe in both directions — it imports nothing but solid-js and its own CSS
 * module, so no part of the SDK is dragged into the app graph. The prototypes
 * tree is dead-code-eliminated from the app build and the app never imports
 * back the other way (README.md here).
 */
import type { JSX } from 'solid-js';
import { For } from 'solid-js';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { Alert } from '../../ui/elements/feedback/Alert';
import { WidgetCard } from '../../ui/elements/display/WidgetCard';
import {
  CustomersIcon,
  FileIcon,
  ReplenishmentIcon,
  StockIcon,
  TruckIcon,
  UserIcon,
} from '../../ui/icons';
import { NavigatorGrid } from '../../../plugins/cook_islands/src/navigator/NavigatorGrid';
import styles from './standIns.module.css';

/* Scenery. Chosen to be awkward rather than tidy — a four-digit figure and the
   longest labels in the spec table are what actually test the wrap. */
interface Figure {
  label: string;
  value: string;
}

const StandInFigures = (props: { figures: Figure[] }) => (
  <div class={styles.figures}>
    <For each={props.figures}>
      {figure => (
        <div class={styles.figure}>
          <span class={styles.value}>{figure.value}</span>
          <span class={styles.figureLabel}>{figure.label}</span>
        </div>
      )}
    </For>
  </div>
);

/*
 * A task tile. The card itself is the REAL thing — the host's Widget card role,
 * the same component the plugin reaches through the SDK (CK-1.9), so the
 * heights, the content slot's bottom-pinning and the hover/focus behaviour in
 * this preview are the ones the navigator will actually have. Only what sits in
 * the content slot is scenery.
 */
const StandInTile = (props: {
  title: string;
  subtitle: string;
  icon: JSX.Element;
  figures: Figure[];
}) => (
  <WidgetCard
    title={props.title}
    subtitle={props.subtitle}
    icon={props.icon}
    onClick={() => {}}
  >
    <StandInFigures figures={props.figures} />
  </WidgetCard>
);

/*
 * The strip, as a shape only. The real one is a card whose body AND five cells
 * are independently activatable — sibling targets, never nested buttons — which
 * is the trap CK-2.2 exists to solve and precisely what is not attempted here.
 * Nothing in it is clickable.
 */
const StandInStrip = () => (
  <div class={styles.strip}>
    <span class={styles.stripIcon} aria-hidden="true">
      <StockIcon />
    </span>
    <span class={styles.stripTitle}>Stock Management</span>
    <div class={styles.stripCells}>
      <For
        each={[
          { label: 'Expired batches', value: '12' },
          { label: 'Batches expiring in a month', value: '3' },
          { label: 'Batches expiring between 1–3 months', value: '28' },
          { label: 'Out of stock items', value: '7' },
          { label: 'Items with less than 3 months of stock', value: '41' },
        ]}
      >
        {cell => (
          <div class={styles.stripCell}>
            <span class={styles.value}>{cell.value}</span>
            <span class={styles.stripCellLabel}>{cell.label}</span>
          </div>
        )}
      </For>
    </div>
  </div>
);

/* Labels, action lines and figure names are the spec's literal copy
   (ui-surface.md § S2). The numbers are invented. */
const TASK_TILES = [
  {
    title: 'Internal Order',
    subtitle: 'Create an order',
    icon: <CustomersIcon />,
    figures: [
      { label: 'This week', value: '6' },
      { label: 'This month', value: '2' },
    ],
  },
  {
    title: 'Receiving Orders',
    subtitle: 'Receive a shipment',
    icon: <TruckIcon />,
    figures: [
      { label: 'Waiting to receive', value: '4' },
      { label: 'Received this week', value: '11' },
    ],
  },
  {
    title: 'Issuing Stock',
    subtitle: 'Send stock to another facility',
    icon: <ReplenishmentIcon />,
    figures: [
      { label: 'Issued today', value: '9' },
      { label: 'This week', value: '38' },
    ],
  },
  {
    title: 'Stocktake',
    subtitle: 'Count some stock',
    icon: <FileIcon />,
    /* Both dashed, per S2: cycle tracking is still being specced, so the real
       tile ships in exactly this state (CK-3.7). */
    figures: [
      { label: 'Of cycle counted', value: '—' },
      { label: 'Overdue items', value: '—' },
    ],
  },
];

export const CkHomeNavigatorPrototype = () => (
  <Page
    fillBody
    header={
      <Header>
        <Breadcrumb crumbs={[{ label: 'Cook Islands Home Navigator' }]} />
      </Header>
    }
  >
    <Alert severity="info">
      <b>The grid is real; everything inside a tile is scenery.</b> The layout
      shell is CK-2.3, in <code>plugins/cook_islands/</code>. The tiles' figures
      and the Stock Management strip are stand-ins for CK-2.2 and are discarded
      when it lands — in particular the strip's cells are not the sibling
      targets the real one needs.
    </Alert>

    <p class={styles.frameNote}>
      Drag the frame's bottom-right corner to resize it. The hero and the
      two-by-two block share a row until they no longer fit, then the block
      wraps beneath the hero; the block itself falls to one column when its
      tracks can't hold two. No width is asked for anywhere — try it with the
      nav rail both docked and collapsed.
    </p>

    <div class={styles.frame} style={{ 'block-size': '44.6875rem' }}>
      <NavigatorGrid
        hero={
          <StandInTile
            title="Dispensary"
            subtitle="Dispense to a patient"
            icon={<UserIcon />}
            figures={[{ label: 'Dispensed today', value: '1284' }]}
          />
        }
        tasks={
          <For each={TASK_TILES}>{tile => <StandInTile {...tile} />}</For>
        }
        strip={<StandInStrip />}
      />
    </div>
  </Page>
);
