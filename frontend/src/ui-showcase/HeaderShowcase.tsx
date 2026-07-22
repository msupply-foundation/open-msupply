import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../ui/layout/Header/Toolbar';
import { Button } from '../ui/elements/buttons/Button';
import { SplitButton } from '../ui/elements/buttons/SplitButton';
import { TruckIcon, PlusCircleIcon, DownloadIcon } from '../ui/icons';
import { Card, PageBody, PageFrame, Stack, ToolbarStub } from './common';

const EXPORT_OPTIONS = [
  { value: 'csv', label: 'Export CSV' },
  { value: 'excel', label: 'Export Excel' },
];

export const HeaderShowcase = () => (
  <Stack>
    <Card
      title="Page header — the Outbound Shipments demo"
      lead={
        <>
          The core page-layout atom, reproducing last week's demo.{' '}
          <code>&lt;Header&gt;</code> is pure layout with zero state — the page
          supplies its three parts as children: <code>&lt;Breadcrumb&gt;</code>{' '}
          (the trail data, later derived from the route),{' '}
          <code>&lt;HeaderButtons&gt;</code> (the page's actions — library
          Button / SplitButton, handlers owned by the page), and a per-page{' '}
          <code>&lt;Toolbar&gt;</code> on its own full-width row (stubbed here;
          filters and tabs come later).
        </>
      }
    >
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
    </Card>

    <Card
      title="Trail links, omission, intrinsic wrap"
      lead={
        <>
          A deeper trail on a detail page: ancestor crumbs with a{' '}
          <code>to</code> render as real links, and the current page renders as
          the page's <code>&lt;h1&gt;</code> (styled as just another crumb),
          marked <code>aria-current="page"</code>. Every part is optional — this
          one omits the <code>&lt;Toolbar&gt;</code>. Squeeze the window to
          watch the buttons wrap below the breadcrumb intrinsically; no
          breakpoints involved. Inside the app shell, the narrow-viewport
          hamburger slots into this strip automatically (see the App shell
          section).
        </>
      }
    >
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
    </Card>
  </Stack>
);
