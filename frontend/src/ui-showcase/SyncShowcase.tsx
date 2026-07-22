import { ProgressList } from '../ui/sync/ProgressList';
import {
  ChevronsDownIcon,
  ChevronsUpIcon,
  ClockIcon,
  DownloadIcon,
} from '../ui/icons';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Lead } from './common';

/*
 * Demos for the sync-specific components (src/ui/sync) — this section mirrors
 * that folder group, as every showcase section mirrors its ui/ group.
 */
export const SyncShowcase = () => (
  <ContentContainer size="form">
    <Stack gap="lg">
      <DashboardCard title="Progress list — determinate sync steps">
        <Lead>
          The sync surfaces' phase list (<code>ui/sync</code>), rendered as the
          current app's horizontal stepper: circled icon markers joined by
          connectors (a step without an icon shows its number), label +
          done/total beneath, the in-flight marker pulsing. <code>variant</code>{' '}
          picks the tone (primary = the sync modal, secondary = initialisation);{' '}
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
              },
              {
                label: 'Waiting for integration',
                icon: ClockIcon,
                started: true,
                finished: true,
              },
              {
                label: 'Pull',
                icon: ChevronsDownIcon,
                started: true,
                finished: false,
                done: 5,
                total: 10,
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
              },
              {
                label: 'Pull remote',
                icon: ChevronsDownIcon,
                started: true,
                finished: false,
                done: 7260,
                total: 80754,
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
