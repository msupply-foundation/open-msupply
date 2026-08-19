import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t } from '@/intl';
import { CloseButton } from '@/ui/elements/buttons/StandardButtons';
import { StatusIndicator } from '@/ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import type { RnrFormNode } from './rnrFormUpdate';
import { isFinalised } from '../list/rnrFormStatus';
import { FinaliseRnrFormAction } from './actions/FinaliseRnrFormAction';

// The detail footer (spec/rnr-forms/ui-surface.md S3 § footer): the
// Draft → Finalised lifecycle indicator, Close back to the list, and the
// Finalise action (its confirm machine lives in detail/actions/).

export const RnrFormStatusFooter: Component<{
  node: RnrFormNode;
  /** Any draft line currently violating the balance rules. */
  hasErrorLines: () => boolean;
  /** Scroll the table to the first error line (the errors phase's confirm). */
  onShowFirstError: () => void;
  /** Flush edits, finalise, splice the result; resolves false on failure. */
  onFinalise: () => Promise<boolean>;
}> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  const finalised = () => isFinalised(props.node.status);

  // Draft carries its reached-at datetime for the history popover; the schema
  // exposes no finalised stamp, so that step legitimately stays undated.
  const steps = () => [
    { label: t('label.draft'), date: props.node.createdDatetime },
    { label: t('label.finalised') },
  ];

  return (
    <ContentFooter>
      <StatusIndicator steps={steps()} current={finalised() ? 1 : 0} />
      <ContentFooterActions>
        <CloseButton
          data-testid="close-button"
          onClick={() =>
            navigate(`/${params.storeId}/replenishment/r-and-r-forms`)
          }
        />
        <FinaliseRnrFormAction
          node={props.node}
          hasErrorLines={props.hasErrorLines}
          onShowFirstError={props.onShowFirstError}
          onFinalise={props.onFinalise}
        />
      </ContentFooterActions>
    </ContentFooter>
  );
};
