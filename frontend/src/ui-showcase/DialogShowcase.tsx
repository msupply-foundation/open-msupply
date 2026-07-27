import { createSignal, For, Show } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Alert } from '../ui/elements/feedback/Alert';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { ConfirmDialog } from '../ui/elements/feedback/ConfirmDialog';
import { Button } from '../ui/elements/buttons/Button';
import { TextField } from '../ui/elements/inputs/TextField';
import {
  StoreSelector,
  type StoreOption,
} from '../ui/elements/selectors/StoreSelector';
import {
  CancelButton,
  SaveButton,
  DialogSaveButton,
} from '../ui/elements/buttons/StandardButtons';
import { PlusCircleIcon } from '../ui/icons';
import { Lead, Note, Row, SectionTOC } from './common';
import type { PageMetadata } from './metadata';
import styles from './DialogShowcase.module.css';

/* A stand-in line list for the large "workbench" dialog — enough rows that the
   body overflows and scrolls internally while the header/footer/actions stay
   pinned (the real line-edit modal hosts a DataTable here). */
const WORKBENCH_ROWS = Array.from({ length: 24 }, (_, i) => ({
  code: `ITM-${1001 + i}`,
  name: `Amoxicillin ${250 + i * 25}mg capsules`,
  packs: (i * 7) % 40,
}));

// The two R&D-dataset stores (see the docker sqlite image) plus a few more, so
// the demo reads like the real thing and the list scrolls.
const STORES: StoreOption[] = [
  {
    id: 'AFCA0C9F0743AB43B779FB9EA2E64EAF',
    code: 'Liquica-store',
    name: 'SMS Liquica Store',
  },
  {
    id: '5B28901C52396E4BB098B9862CCF5DF9',
    code: 'chc_ermera',
    name: 'CHC Ermera',
  },
  { id: 'demo-3', code: 'dili-central', name: 'Dili Central Warehouse' },
  { id: 'demo-4', code: 'baucau-hp', name: 'Baucau Health Post' },
  { id: 'demo-5', code: 'maliana-rh', name: 'Maliana Referral Hospital' },
];

export const dialogMetadata: PageMetadata = {
  id: 'dialog',
  title: 'Dialog / Modal',
  searchTerms: ['modal', 'popup', 'overlay'],
  items: [
    {
      id: 'dialog-confirm',
      title: 'Confirm dialog',
      searchTerms: ['are you sure', 'yes', 'no', 'confirmation'],
    },
    {
      id: 'dialog-custom',
      title: 'Custom dialog',
      searchTerms: ['content', 'footer', 'actions'],
    },
    {
      id: 'dialog-large',
      title: 'Large workbench dialog',
      searchTerms: ['wide', 'edit lines', 'size large'],
    },
    {
      id: 'dialog-store-selector',
      title: 'Store selector',
      searchTerms: ['store', 'blocking', 'choose'],
    },
  ],
};

export const DialogShowcase = () => {
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [outcome, setOutcome] = createSignal('');
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [workbenchOpen, setWorkbenchOpen] = createSignal(false);
  const [lines, setLines] = createSignal(WORKBENCH_ROWS);
  const addLine = () =>
    setLines(rows => [
      { code: `ITM-${1001 + rows.length}`, name: 'New line', packs: 0 },
      ...rows,
    ]);
  const [storeOpen, setStoreOpen] = createSignal(false);
  const [chosen, setChosen] = createSignal('');

  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <SectionTOC page={dialogMetadata} />
        <DashboardCard
          id="dialog-confirm"
          title="Confirm dialog — Save → are you sure?"
        >
          <Lead>
            Native <code>&lt;dialog&gt;</code> + <code>showModal()</code>, no
            library — the platform gives the focus trap (top layer + inert
            page), focus restore, Escape and <code>::backdrop</code>; the RnD
            prototype bought Radix for exactly this contract, and the "hard to
            drive from React" objection doesn't exist in Solid. Scrim click and
            Escape both cancel. Watch focus return to the Save button on close.
          </Lead>
          <Row>
            <SaveButton onClick={() => setConfirmOpen(true)} />
            <span class={styles.outcome} role="status">
              {outcome()}
            </span>
          </Row>
          <ConfirmDialog
            open={confirmOpen()}
            onClose={() => {
              setConfirmOpen(false);
              setOutcome(o =>
                o === '' || o.startsWith('Cancelled') ? 'Cancelled.' : o
              );
            }}
            message="Save changes to this shipment? This is the standard Cancel/OK preset — ConfirmDialog is a thin composition over Dialog."
            onConfirm={() => setOutcome('Saved ✓')}
          />
        </DashboardCard>

        <DashboardCard
          id="dialog-custom"
          title="Dialog — custom content, footer and actions"
        >
          <Lead>
            The base <code>&lt;Dialog&gt;</code> takes a required{' '}
            <code>title</code> (its accessible name), optional icon /
            description, free-form children, an optional bottom-pinned{' '}
            <code>footer</code> band and an <code>actions</code> row.{' '}
            <code>widthRem</code> sets a steady width and{' '}
            <code>minBodyHeightRem</code> reserves height so the box doesn't
            jump as content changes — the slack falls above the footer, so
            footer + actions stay on the bottom edge. The browser moves focus to
            the first control and Tab cycles inside while the page behind is
            inert. (Opening a Combobox / Select <em>inside</em> a dialog needs
            extra care — see the "in a dialog" card under Selectors.)
          </Lead>
          <Row>
            <Button
              icon={<PlusCircleIcon />}
              onClick={() => setDialogOpen(true)}
            >
              New shipment
            </Button>
          </Row>
          <Dialog
            open={dialogOpen()}
            onClose={() => setDialogOpen(false)}
            icon={<PlusCircleIcon />}
            title="New shipment"
            description="Give the shipment a reference."
            widthRem={34}
            minBodyHeightRem={16}
            footer={
              <Alert severity="info">
                A new draft shipment will be created.
              </Alert>
            }
            actions={
              <>
                <CancelButton onClick={() => setDialogOpen(false)} />
                <Button
                  icon={<PlusCircleIcon />}
                  onClick={() => setDialogOpen(false)}
                >
                  Create
                </Button>
              </>
            }
          >
            <TextField label="Reference" placeholder="e.g. PO-1042" />
          </Dialog>
        </DashboardCard>

        <DashboardCard
          id="dialog-large"
          title={'Large "workbench" dialog — size="large"'}
        >
          <Lead>
            <code>size="large"</code> fills nearly the whole viewport — full
            width and ~80% height — for content-heavy modals like the stock line
            editor. The body becomes a flex column, so a single tall child (a
            DataTable in the app) fills the space and{' '}
            <em>scrolls internally</em> while the header, <code>footer</code>{' '}
            and <code>actions</code> stay pinned to the edges. Add a line: the
            box holds its size rather than growing. On phones (below the compact
            breakpoint) a large dialog like this goes{' '}
            <strong>full-screen</strong>, edge to edge with no radius — smaller
            dialogs stay centred cards.
          </Lead>
          <Row>
            <Button
              icon={<PlusCircleIcon />}
              onClick={() => setWorkbenchOpen(true)}
            >
              Edit lines
            </Button>
          </Row>
          <Dialog
            open={workbenchOpen()}
            onClose={() => setWorkbenchOpen(false)}
            size="large"
            icon={<PlusCircleIcon />}
            title="Edit lines — stock take"
            headerActions={
              <Button
                variant="secondary"
                icon={<PlusCircleIcon />}
                onClick={addLine}
              >
                Add line
              </Button>
            }
            footer={
              <Alert severity="info">
                {lines().length} lines — the list scrolls; the header, this
                banner and the actions stay put.
              </Alert>
            }
            actions={
              <>
                <CancelButton onClick={() => setWorkbenchOpen(false)} />
                <DialogSaveButton onClick={() => setWorkbenchOpen(false)} />
              </>
            }
          >
            <div class={styles.workbench}>
              <For each={lines()}>
                {line => (
                  <div class={styles.workbenchRow}>
                    <span class={styles.workbenchCode}>{line.code}</span>
                    <span class={styles.workbenchName}>{line.name}</span>
                    <span class={styles.workbenchPacks}>
                      {line.packs} packs
                    </span>
                  </div>
                )}
              </For>
            </div>
          </Dialog>
        </DashboardCard>

        <DashboardCard
          id="dialog-store-selector"
          title="Store selector — in a blocking Dialog"
        >
          <Lead>
            The <code>StoreSelector</code> library component styled after the
            current app's login store-selector — <code>TextField</code> search,
            a bordered selectable list with <code>Default</code> /{' '}
            <code>Last used</code> StatusChips, and a <code>Continue</code>{' '}
            button (select-then-confirm; double-click a row to confirm
            directly). Here it fills a{' '}
            <code>
              dismissable={'{'}false{'}'}
            </code>{' '}
            Dialog — blocking (no scrim/Escape dismiss, an answer is required),
            exactly as the app's store login uses it.
          </Lead>
          <Row>
            <Button onClick={() => setStoreOpen(true)}>
              Open store selection
            </Button>
          </Row>
          <Show when={chosen()}>
            <Note>{chosen()}</Note>
          </Show>
          <Dialog
            open={storeOpen()}
            onClose={() => setStoreOpen(false)}
            dismissable={false}
            title="Select a store"
          >
            <StoreSelector
              stores={STORES}
              defaultStoreId="AFCA0C9F0743AB43B779FB9EA2E64EAF"
              lastUsedStoreId="5B28901C52396E4BB098B9862CCF5DF9"
              onConfirm={id => {
                const store = STORES.find(s => s.id === id);
                setChosen(store ? `Entered ${store.name}` : '');
                setStoreOpen(false);
              }}
            />
          </Dialog>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};
