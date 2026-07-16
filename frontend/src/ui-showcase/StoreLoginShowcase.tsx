import { createSignal, Show, type JSX } from 'solid-js';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { Button } from '../ui/elements/buttons/Button';
import {
  StoreSelector,
  type StoreOption,
} from '../ui/elements/selectors/StoreSelector';
import styles from './FeedbackShowcase.module.css';

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

export const StoreLoginShowcase = () => {
  const [open, setOpen] = createSignal(false);
  const [chosen, setChosen] = createSignal('');

  return (
    <div class={styles.stack}>
      <Card
        title="Store selector — in a Dialog"
        lead={
          <>
            The <code>StoreSelector</code> library component styled after the
            current app's login store-selector — <code>TextField</code> search,
            a bordered selectable list with <code>Default</code> /{' '}
            <code>Last used</code> StatusChips, and a <code>Continue</code>{' '}
            button (select-then-confirm; double-click a row to confirm
            directly). Here it fills a blocking <code>&lt;Dialog&gt;</code>,
            exactly as the app's store login uses it.
          </>
        }
      >
        <Button onClick={() => setOpen(true)}>Open store selection</Button>
        <Show when={chosen()}>
          <p class={styles.lead} style={{ 'margin-block-start': '0.75rem' }}>
            {chosen()}
          </p>
        </Show>
        <Dialog
          open={open()}
          onClose={() => setOpen(false)}
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
              setOpen(false);
            }}
          />
        </Dialog>
      </Card>
    </div>
  );
};
