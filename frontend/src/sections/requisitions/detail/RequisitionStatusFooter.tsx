import { type Component } from 'solid-js';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import {
  currentStatusStep,
  statusSteps,
} from './requisitionDetailStatus';
import type { RequisitionInfoFragment } from './requisitionDetail.generated';

// The detail footer (spec/requisitions S2 § footer): the lifecycle indicator
// over New → Finalised, each stage stamped with its date. The status/raise
// split button (Create shipment · Confirm Finalised) belongs to the supply and
// finalise slices and lands with them.
export const RequisitionStatusFooter: Component<{
  node: RequisitionInfoFragment;
}> = props => (
  <ContentFooter>
    <StatusIndicator
      steps={statusSteps(props.node)}
      current={currentStatusStep(props.node.status)}
    />
  </ContentFooter>
);
