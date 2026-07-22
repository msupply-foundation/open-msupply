import { createSignal, For, Show } from 'solid-js';
import { Alert } from '../ui/elements/feedback/Alert';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { ConfirmDialog } from '../ui/elements/feedback/ConfirmDialog';
import { Button } from '../ui/elements/buttons/Button';
import { TextField } from '../ui/elements/inputs/TextField';
import {
  StoreSelector,
  type StoreOption,
} from '../ui/elements/selectors/StoreSelector';
import { PlusCircleIcon, SaveIcon, XCircleIcon } from '../ui/icons';
import { Card, Note, Stack } from './common';
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
    <Stack>
      <Card
        title="Confirm dialog — Save → are you sure?"
        lead={
          <>
            Native <code>&lt;dialog&gt;</code> + <code>showModal()</code>, no
            library — the platform gives the focus trap (top layer + inert
            page), focus restore, Escape and <code>::backdrop</code>; the RnD
            prototype bought Radix for exactly this contract, and the "hard to
            drive from React" objection doesn't exist in Solid. Scrim click and
            Escape both cancel. Watch focus return to the Save button on close.
          </>
        }
      >
        <Button
          variant="secondary"
          icon={<SaveIcon />}
          onClick={() => setConfirmOpen(true)}
        >
          Save
        </Button>
        <span class={styles.outcome} role="status">
          {outcome()}
        </span>
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
      </Card>

      <Card
        title="Dialog — custom content, footer and actions"
        lead={
          <>
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
          </>
        }
      >
        <Button icon={<PlusCircleIcon />} onClick={() => setDialogOpen(true)}>
          New shipment
        </Button>
        <Dialog
          open={dialogOpen()}
          onClose={() => setDialogOpen(false)}
          icon={<PlusCircleIcon />}
          title="New shipment"
          description="Give the shipment a reference."
          widthRem={34}
          minBodyHeightRem={16}
          footer={
            <Alert severity="info">A new draft shipment will be created.</Alert>
          }
          actions={
            <>
              <Button
                variant="secondary"
                icon={<XCircleIcon />}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
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
      </Card>

      <Card
        title={'Large "workbench" dialog — size="large"'}
        lead={
          <>
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
          </>
        }
      >
        <Button
          icon={<PlusCircleIcon />}
          onClick={() => setWorkbenchOpen(true)}
        >
          Edit lines
        </Button>
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
              {lines().length} lines — the list scrolls; the header, this banner
              and the actions stay put.
            </Alert>
          }
          actions={
            <>
              <Button
                variant="secondary"
                icon={<XCircleIcon />}
                onClick={() => setWorkbenchOpen(false)}
              >
                Cancel
              </Button>
              <Button
                icon={<SaveIcon />}
                onClick={() => setWorkbenchOpen(false)}
              >
                Save
              </Button>
            </>
          }
        >
          <div class={styles.workbench}>
            <For each={lines()}>
              {line => (
                <div class={styles.workbenchRow}>
                  <span class={styles.workbenchCode}>{line.code}</span>
                  <span class={styles.workbenchName}>{line.name}</span>
                  <span class={styles.workbenchPacks}>{line.packs} packs</span>
                </div>
              )}
            </For>
          </div>
        </Dialog>
      </Card>

      <Card
        title="Store selector — in a blocking Dialog"
        lead={
          <>
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
          </>
        }
      >
        <Button onClick={() => setStoreOpen(true)}>Open store selection</Button>
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
      </Card>
    </Stack>
  );
};
