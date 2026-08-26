import { Show, type Component } from 'solid-js';
import { StatusIndicator } from '@/ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { StatusChangeAction } from './actions/StatusChangeAction';
import { currentStep, isFinalised, statusSteps } from './stockMovementStatus';
import type { StockMovementInfoFragment } from './stockMovementDetail.generated';

// The document-level footer (spec/stock-movements/ui-surface.md S2 § status
// footer): lifecycle indicator (New → Confirmed → Finalised, each stage dated
// once reached) · spacer · the status-advance split button, hidden entirely
// once finalised. No hold concept on this document (rules § editability).
// Shown only when nothing is selected — the selection action bar replaces it
// (the view owns that swap). No Close (D103): leaving the document is the
// breadcrumb's job, in the app bar, where every other screen puts it.

export interface StockMovementStatusFooterProps {
  storeId: string;
  node: StockMovementInfoFragment;
  /** A status advance succeeded — merge the returned info over the node. */
  onAdvanced: (node: StockMovementInfoFragment) => void;
}

export const StockMovementStatusFooter: Component<
  StockMovementStatusFooterProps
> = props => {
  return (
    <ContentFooter>
      <StatusIndicator
        steps={statusSteps(props.node)}
        current={currentStep(props.node.status)}
      />
      <ContentFooterActions>
        <Show when={!isFinalised(props.node.status)}>
          <StatusChangeAction
            storeId={props.storeId}
            node={props.node}
            onApplied={props.onAdvanced}
          />
        </Show>
      </ContentFooterActions>
    </ContentFooter>
  );
};
