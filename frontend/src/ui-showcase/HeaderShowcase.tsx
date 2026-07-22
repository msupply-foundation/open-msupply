import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../ui/layout/Header/Toolbar';
import { Button } from '../ui/elements/buttons/Button';
import { SplitButton } from '../ui/elements/buttons/SplitButton';
import { TruckIcon, PlusCircleIcon, DownloadIcon } from '../ui/icons';
import { Lead, PageBody, PageFrame, ToolbarStub } from './common';

const EXPORT_OPTIONS = [
  { value: 'csv', label: 'Export CSV' },
  { value: 'excel', label: 'Export Excel' },
];

/*
 * The first page converted to the dogfooded chrome pattern (2026-07-23, now
 * showcase-wide — see kdd/showcase-harness): page column is ContentContainer
 * + app Stack, demo sections are the app's DashboardCard with a <Lead> child.
 */
export const HeaderShowcase = () => (
  <ContentContainer size="form">
    <Stack gap="lg">
      <DashboardCard title="Page header — the Outbound Shipments demo">
        <Lead>
          The core page-layout atom, reproducing last week's demo.{' '}
          <code>&lt;Header&gt;</code> is pure layout with zero state — the page
          supplies its three parts as children: <code>&lt;Breadcrumb&gt;</code>{' '}
          (the trail data, later derived from the route),{' '}
          <code>&lt;HeaderButtons&gt;</code> (the page's actions — library
          Button / SplitButton, handlers owned by the page), and a per-page{' '}
          <code>&lt;Toolbar&gt;</code> on its own full-width row (stubbed here;
          filters and tabs come later).
        </Lead>
        <PageFrame>
          <Header>
            <Breadcrumb
              icon={<TruckIcon />}
              crumbs={[{ label: 'Outbound Shipments' }]}
            />
            <HeaderButtons>
              <Button icon={<PlusCircleIcon />}>New shipment</Button>
              <SplitButton
                icon={<DownloadIcon />}
                options={EXPORT_OPTIONS}
                menuLabel="Export options"
              />
            </HeaderButtons>
            <Toolbar>
              <ToolbarStub>Toolbar</ToolbarStub>
            </Toolbar>
          </Header>
          <PageBody />
        </PageFrame>
      </DashboardCard>

      <DashboardCard title="Trail links, omission, intrinsic wrap">
        <Lead>
          A deeper trail on a detail page: ancestor crumbs with a{' '}
          <code>to</code> render as real links, and the current page renders as
          the page's <code>&lt;h1&gt;</code> (styled as just another crumb),
          marked <code>aria-current="page"</code>. Every part is optional — this
          one omits the <code>&lt;Toolbar&gt;</code>. Squeeze the window to
          watch the buttons wrap below the breadcrumb intrinsically; no
          breakpoints involved. Inside the app shell, the narrow-viewport
          hamburger slots into this strip automatically (see the App shell
          section).
        </Lead>
        <PageFrame>
          <Header>
            <Breadcrumb
              icon={<TruckIcon />}
              crumbs={[
                { label: 'Outbound Shipments', to: '#/header' },
                { label: 'OS-001024' },
              ]}
            />
            <HeaderButtons>
              <Button icon={<PlusCircleIcon />}>Add item</Button>
              <SplitButton
                icon={<DownloadIcon />}
                options={EXPORT_OPTIONS}
                menuLabel="Export options"
              />
            </HeaderButtons>
          </Header>
          <PageBody />
        </PageFrame>
      </DashboardCard>
    </Stack>
  </ContentContainer>
);
