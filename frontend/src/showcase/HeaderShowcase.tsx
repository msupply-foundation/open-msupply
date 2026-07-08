import type { JSX } from 'solid-js'
import { Header } from '../components/layout/Header/Header'
import { Breadcrumb } from '../components/layout/Header/Breadcrumb'
import { HeaderButtons } from '../components/layout/Header/HeaderButtons'
import { Toolbar } from '../components/layout/Header/Toolbar'
import { Button } from '../components/ui/Button'
import { SplitButton } from '../components/ui/SplitButton'
import { TruckIcon, PlusCircleIcon, DownloadIcon } from '../components/icons'
import styles from './HeaderShowcase.module.css'

const Card = (props: {
  title: string
  lead: JSX.Element
  children: JSX.Element
}) => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>{props.title}</header>
    <div class={styles.cardBody}>
      <p class={styles.lead}>{props.lead}</p>
      {props.children}
    </div>
  </section>
)

const EXPORT_OPTIONS = [
  { value: 'csv', label: 'Export CSV' },
  { value: 'excel', label: 'Export Excel' },
]

export const HeaderShowcase = () => (
  <div class={styles.stack}>
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
      <div class={styles.pageFrame}>
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
            <span class={styles.toolbarStub}>Toolbar</span>
          </Toolbar>
        </Header>
        <div class={styles.pageBody} aria-hidden="true" />
      </div>
    </Card>

    <Card
      title="Trail links, omission, intrinsic wrap"
      lead={
        <>
          A deeper trail on a detail page: ancestor crumbs with a{' '}
          <code>to</code> render as real links, and the current page renders as
          the page's <code>&lt;h1&gt;</code> (styled as just another crumb),
          marked <code>aria-current="page"</code>. Every part is optional —
          this one omits the <code>&lt;Toolbar&gt;</code>. Squeeze the window
          to watch the buttons wrap below the breadcrumb intrinsically; no
          breakpoints involved. Inside the app shell, the narrow-viewport
          hamburger slots into this strip automatically (see the App shell
          section).
        </>
      }
    >
      <div class={styles.pageFrame}>
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
        <div class={styles.pageBody} aria-hidden="true" />
      </div>
    </Card>
  </div>
)
