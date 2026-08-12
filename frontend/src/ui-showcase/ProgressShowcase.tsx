import type { JSX } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import {
  StatusIndicator,
  type StatusStep,
} from '../ui/elements/feedback/StatusIndicator';
import { ProgressList } from '../ui/sync/ProgressList';
import {
  ChevronsDownIcon,
  ChevronsUpIcon,
  ClockIcon,
  DownloadIcon,
} from '../ui/icons';
import { Intro, Lead, Note, SectionTOC } from './common';
import type { PageMetadata } from './metadata';

/*
 * A shipment lifecycle for the StatusIndicator demos: reached stages carry the
 * datetime they were reached (shown in the history popover); stages not yet
 * reached have no date. The `current` index each card passes decides how far
 * along the flow reads.
 */
const SHIPMENT_STEPS: StatusStep[] = [
  { label: 'New', date: '2026-03-01' },
  { label: 'Picked', date: '2026-03-03' },
  { label: 'Shipped', date: '2026-03-04' },
  { label: 'Delivered' },
  { label: 'Verified' },
];

/*
 * The Progress section gathers the components that show where a process is: the
 * StatusIndicator — a read-only status breadcrumb with a history popover — and
 * the ProgressList stepper for a live multi-phase operation, shown first in its
 * bare form and then as the sync surfaces' specialised case.
 */
export const progressMetadata: PageMetadata = {
  id: 'progress',
  title: 'Progress',
  searchTerms: ['status', 'progression', 'stepper', 'sync', 'phase'],
  items: [
    {
      id: 'progress-status',
      title: 'Status indicator',
      searchTerms: ['stages', 'chevron', 'current', 'reached', 'history'],
    },
    {
      id: 'progress-status-stages',
      title: 'Reading the current stage',
      searchTerms: ['new', 'in progress', 'verified', 'accent'],
    },
    {
      id: 'progress-status-static',
      title: 'Without the history popover',
      searchTerms: ['static', 'read-only', 'no popover'],
    },
    {
      id: 'progress-stepper',
      title: 'Progress stepper',
      searchTerms: ['steps', 'phase', 'determinate', 'connector', 'marker'],
    },
    {
      id: 'progress-sync',
      title: 'Sync progress',
      searchTerms: [
        'sync',
        'push',
        'pull',
        'integrate',
        'done',
        'total',
        'count',
        'popover',
      ],
    },
  ],
};

// Sync-demo phase timestamps, relative to page load: the in-flight steps'
// elapsed time ticks live from these.
const demoLoadedAt = Date.now();
const demoAgo = (seconds: number): string =>
  new Date(demoLoadedAt - seconds * 1000).toISOString();

// A captioned demo row — the small grey label above one indicator.
const Case = (props: { caption: string; children: JSX.Element }) => (
  <div>
    <Note>{props.caption}</Note>
    {props.children}
  </div>
);

export const ProgressShowcase = () => (
  <ContentContainer size="form" align="start">
    <Stack gap="lg">
      <SectionTOC page={progressMetadata} />
      <Intro>
        Two ways to show where a process is. The{' '}
        <strong>status indicator</strong> is a read-only breadcrumb of a
        document's lifecycle — which stage it has reached — with the history a
        hover away. The <strong>progress stepper</strong> tracks a live
        multi-phase operation as it runs; the sync surfaces are its specialised
        case, adding intent icons and record counts.
      </Intro>

      <DashboardCard
        id="progress-status"
        title="Status indicator — hover for history"
      >
        <Lead>
          A document's status progression as a row of chevron-separated stages —
          the shared control across every detail view (stocktake, shipments,
          requisitions…). Reached stages read in the normal body colour, the{' '}
          <strong>current</strong> stage is the brand accent, and stages not yet
          reached are greyed. Hovering (or focusing) the whole row opens a
          history popover — each stage on a vertical timeline with the datetime
          it was reached. Meaning never rides on colour alone: position, the
          accent weight, and the popover timeline all carry it.
        </Lead>
        <StatusIndicator steps={SHIPMENT_STEPS} current={2} />
        <Note>← Hover or focus the row to open the status history.</Note>
      </DashboardCard>

      <DashboardCard
        id="progress-status-stages"
        title="Reading the current stage"
      >
        <Lead>
          The same flow at three points in its lifecycle — the accent marks{' '}
          <code>current</code>, everything before it reads as reached.
        </Lead>
        <Stack gap="md">
          <Case caption="Just created (current: New)">
            <StatusIndicator steps={SHIPMENT_STEPS} current={0} />
          </Case>
          <Case caption="In progress (current: Shipped)">
            <StatusIndicator steps={SHIPMENT_STEPS} current={2} />
          </Case>
          <Case caption="Complete (current: Verified)">
            <StatusIndicator
              steps={SHIPMENT_STEPS.map(step => ({
                ...step,
                date: step.date ?? '2026-03-06',
              }))}
              current={4}
            />
          </Case>
        </Stack>
      </DashboardCard>

      <DashboardCard
        id="progress-status-static"
        title="Without the history popover"
      >
        <Lead>
          Pass <code>history={'{false}'}</code> for a plain read-only breadcrumb
          with no popover — for a context that already shows the timeline
          elsewhere, or where the hover affordance would compete with another
          control.
        </Lead>
        <StatusIndicator steps={SHIPMENT_STEPS} current={2} history={false} />
      </DashboardCard>

      <DashboardCard
        id="progress-stepper"
        title="Progress stepper — determinate phases"
      >
        <Lead>
          A live multi-phase operation as the current app's horizontal stepper:
          circled markers joined by connectors, a label beneath each, the
          in-flight marker pulsing and carrying <code>aria-current="step"</code>
          . Completion is derived from progression (anything before the
          furthest-started step reads complete), and each step carries
          visually-hidden status text (pending / in progress / done / error) so
          meaning never rides on colour alone. In this <strong>bare</strong>{' '}
          form a step is just a label plus <code>started</code>/
          <code>finished</code>; with no <code>icon</code> the marker shows its
          number.
        </Lead>
        <ProgressList
          steps={[
            { label: 'Queued', started: true, finished: true },
            { label: 'Processing', started: true, finished: false },
            { label: 'Finalising', started: false, finished: false },
            { label: 'Complete', started: false, finished: false },
          ]}
        />
      </DashboardCard>

      <DashboardCard
        id="progress-sync"
        title="Sync progress — the stepper's specialised case"
      >
        <Lead>
          The sync surfaces' phase list (<code>ui/sync</code>) is the same
          stepper with a marker <code>icon</code> per phase (a step without one
          shows its number) and <strong>one</strong> <code>done</code>/
          <code>total</code> count — beneath the in-flight step only, so the
          live number is the only one on the row and the columns never shift as
          digits grow. The in-flight marker's border doubles as a determinate
          progress ring — the filled tone floods from the incoming connector
          toward the far side, top and bottom halves in step, meeting the
          outgoing connector at 100% — and a connector that newly fills plays a
          one-shot lightened sweep as the fill arrives. The in-flight step's
          elapsed time ticks live beneath its count (given{' '}
          <code>startedAt</code>/<code>finishedAt</code>; it freezes at the
          failure point on <code>error</code> — the second demo). A completed
          step's final count and duration are a hover/focus popover on its
          marker (hover or Tab to one below). <code>variant</code> picks the
          tone (primary = the sync modal, secondary = initialisation);{' '}
          <code>error</code> flags the in-flight step. Steps are position-keyed
          (<code>&lt;Index&gt;</code>) and update in place, so consumers can
          rebuild the step objects on every status tick. Both demos are genuine
          phase sets: the v7 operational modal, and a v5/v6 remote-site
          initialisation (which never pushes; its <em>Prepare</em> step has no
          icon, so it shows its number).
        </Lead>
        <Stack gap="lg">
          <ProgressList
            steps={[
              {
                label: 'Push',
                icon: ChevronsUpIcon,
                started: true,
                finished: true,
                done: 120,
                total: 120,
                startedAt: demoAgo(160),
                finishedAt: demoAgo(148),
              },
              {
                label: 'Waiting for integration',
                icon: ClockIcon,
                started: true,
                finished: true,
                startedAt: demoAgo(148),
                finishedAt: demoAgo(42),
              },
              {
                label: 'Pull',
                icon: ChevronsDownIcon,
                started: true,
                finished: false,
                done: 5,
                total: 10,
                startedAt: demoAgo(42),
              },
              {
                label: 'Integrate',
                icon: DownloadIcon,
                started: false,
                finished: false,
              },
            ]}
          />
          <ProgressList
            variant="secondary"
            error
            steps={[
              { label: 'Prepare', started: true, finished: true },
              {
                label: 'Pull central',
                icon: ChevronsDownIcon,
                started: true,
                finished: true,
                done: 33568,
                total: 33568,
                startedAt: demoAgo(5045),
                finishedAt: demoAgo(801),
              },
              {
                label: 'Pull remote',
                icon: ChevronsDownIcon,
                started: true,
                finished: false,
                done: 7260,
                total: 80754,
                startedAt: demoAgo(801),
              },
              {
                label: 'Pull V6',
                icon: ChevronsDownIcon,
                started: false,
                finished: false,
              },
              {
                label: 'Integrate',
                icon: DownloadIcon,
                started: false,
                finished: false,
              },
            ]}
          />
        </Stack>
      </DashboardCard>
    </Stack>
  </ContentContainer>
);
