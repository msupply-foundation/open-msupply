import { Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { CloseButton } from '@/ui/elements/buttons/StandardButtons';
import { StatusIndicator } from '@/ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { StatusChangeAction } from './actions/StatusChangeAction';
import { currentStep, isFinalised, statusSteps } from './stockMovementStatus';
import type { StockMovementInfoFragment } from './stockMovementDetail.generated';

// The document-level footer (spec/stock-movements/ui-surface.md S2 § status
// footer): lifecycle indicator (New → Confirmed → Finalised, each stage dated
// once reached) · spacer · Close · the status-advance split button, hidden
// entirely once finalised. No hold concept on this document (rules
// § editability). Shown only when nothing is selected — the selection action
// bar replaces it (the view owns that swap).

export interface StockMovementStatusFooterProps {
  storeId: string;
  node: StockMovementInfoFragment;
  /** A status advance succeeded — merge the returned info over the node. */
  onAdvanced: (node: StockMovementInfoFragment) => void;
}

export const StockMovementStatusFooter: Component<
  StockMovementStatusFooterProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  return (
    <ContentFooter>
      <StatusIndicator
        steps={statusSteps(props.node)}
        current={currentStep(props.node.status)}
      />
      <ContentFooterActions>
        <CloseButton
          data-testid="close-button"
          onClick={() =>
            navigate(`/${params.storeId}/inventory/stock-movement`)
          }
        />
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
