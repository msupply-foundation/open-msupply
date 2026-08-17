import { type Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { CopyToClipboardButton } from '@/ui/elements/buttons/CopyToClipboardButton';
import { FullStocktake } from '../lines/stocktakeDetail.generated';

export interface CopyStocktakeActionProps {
  storeId: string;
  stocktakeId: string;
}

// The detail side-panel "Copy to clipboard" action — a self-contained peer of
// the other detail actions (kdd/action-modal), but with no modal: it supplies
// the WHOLE stocktake (info + every line, unpaginated — the FullStocktake
// query's nested `lines` connector, NOT the server-paged detail table) to the
// shared CopyToClipboardButton, which owns the JSON serialisation, the
// always-available gate, and the in-place copied/failed feedback
// (spec/ui-standards/controls.md § copy to clipboard).
//
// A fetch/transport failure is routed to the global error modal by
// graphqlFetch; a NodeError (bad id — not expected from a screen showing the
// record) likewise promotes to the global modal via mapSuccessToError, and
// nothing is copied.
export const CopyStocktakeAction: Component<
  CopyStocktakeActionProps
> = props => {
  const load = async () => {
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
    if (result.kind !== 'success') return undefined;
    if (result.data.stocktake.__typename !== 'StocktakeNode') return undefined;
    // The node itself — the old app copies the record, not the query wrapper
    // ({"stocktake": …}).
    return result.data.stocktake;
  };

  return <CopyToClipboardButton load={load} />;
};
