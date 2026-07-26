import { createSignal, onCleanup, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CheckIcon, CopyIcon } from '../../../../ui/icons';
import { FullStocktake } from '../lines/stocktakeDetail.generated';

export interface CopyStocktakeActionProps {
  storeId: string;
  stocktakeId: string;
}

// The detail side-panel "Copy to clipboard" action — a self-contained peer of
// the other detail actions (kdd/action-modal), but with no modal: a single
// button that fetches the WHOLE stocktake (info + every line, unpaginated — the
// FullStocktake query's nested `lines` connector, NOT the server-paged detail
// table) and writes it to the clipboard as pretty JSON.
//
// Unlike the list bulk-delete this is ALWAYS available (spec/stocktakes/
// ui-surface.md — copy is not gated on editability). Feedback follows
// ui-standards/controls § action feedback (never a toast): the button itself
// briefly swaps to a "copied" confirmation, then reverts. A fetch/transport
// failure is routed to the global error modal by graphqlFetch; a NodeError (bad
// id — not expected from a screen showing the record) likewise promotes to the
// global modal via mapSuccessToError, and we simply don't copy.
const COPIED_MS = 2000;

export const CopyStocktakeAction: Component<
  CopyStocktakeActionProps
> = props => {
  // busy while the fetch is in flight; feedback briefly after the write
  // succeeds or fails (drives the button's label/icon swap).
  const [busy, setBusy] = createSignal(false);
  const [feedback, setFeedback] = createSignal<'copied' | 'failed'>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));
  const flashFeedback = (kind: 'copied' | 'failed') => {
    setFeedback(kind);
    clearTimeout(timer);
    timer = setTimeout(() => setFeedback(undefined), COPIED_MS);
  };

  const run = async () => {
    if (busy()) return; // re-entry guard
    setBusy(true);
    try {
      const result = await graphqlFetch(
        FullStocktake,
        { storeId: props.storeId, stocktakeId: props.stocktakeId },
        {
          // A NodeError on a record we're viewing is unexpected → promote its
          // description to the global unexpected-error modal (same convention as
          // the detail view's info fetch).
          mapSuccessToError: d =>
            d.stocktake.__typename === 'NodeError'
              ? d.stocktake.error.description
              : undefined,
        }
      );
      if (result.kind !== 'success') return;
      if (result.data.stocktake.__typename !== 'StocktakeNode') return;

      // The node itself, pretty-printed — the old app copies the record, not
      // the query wrapper ({"stocktake": …}).
      const json = JSON.stringify(result.data.stocktake, null, 2);
      try {
        await navigator.clipboard.writeText(json);
      } catch {
        // Clipboard write refused — e.g. Safari's user-activation window
        // expired over a slow fetch. Surface in the same in-place slot.
        flashFeedback('failed');
        return;
      }
      flashFeedback('copied');
    } finally {
      setBusy(false);
    }
  };

  return (
    // aria-live so the label swap is announced by assistive tech (no
    // visually-hidden twin — a hidden duplicate of the label trips strict
    // e2e text locators).
    <Button
      variant="secondary"
      aria-live="polite"
      icon={feedback() === 'copied' ? <CheckIcon /> : <CopyIcon />}
      loading={busy()}
      data-testid="copy-stocktake-button"
      onClick={() => void run()}
    >
      {feedback() === 'copied'
        ? t('message.copy-success')
        : feedback() === 'failed'
          ? t('message.copy-failed')
          : t('button.copy-to-clipboard')}
    </Button>
  );
};
