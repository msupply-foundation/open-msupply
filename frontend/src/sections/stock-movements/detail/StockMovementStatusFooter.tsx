import { createSignal, Show, type Component } from 'solid-js';
import { StatusIndicator } from '@/ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import {
  ContentFooterMessage,
  type FooterMessage,
} from '@/ui/layout/ContentFooter/ContentFooterMessage';
import { t } from '@/intl';
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
// A status change that lands is reported in the bar's message slot, as a
// flash of the save confirmation (spec/ui-standards/controls.md § action
// feedback) — the split button is gone once finalised.

export interface StockMovementStatusFooterProps {
  storeId: string;
  node: StockMovementInfoFragment;
  /** A status advance succeeded — merge the returned info over the node. */
  onAdvanced: (node: StockMovementInfoFragment) => void;
}

export const StockMovementStatusFooter: Component<
  StockMovementStatusFooterProps
> = props => {
  const [outcome, setOutcome] = createSignal<FooterMessage>();

  const onApplied = (node: StockMovementInfoFragment) => {
    props.onAdvanced(node);
    setOutcome({ type: 'success', text: t('messages.saved') });
  };

  return (
    <ContentFooter>
      <StatusIndicator
        steps={statusSteps(props.node)}
        current={currentStep(props.node.status)}
      />
      <ContentFooterMessage message={outcome()} />
      <ContentFooterActions>
        <Show when={!isFinalised(props.node.status)}>
          <StatusChangeAction
            storeId={props.storeId}
            node={props.node}
            onApplied={onApplied}
          />
        </Show>
      </ContentFooterActions>
    </ContentFooter>
  );
};
