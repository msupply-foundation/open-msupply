import type { Component } from 'solid-js';
import { t } from '@/intl';
import { StatusIndicator } from '@/ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import type { RnrFormNode } from './rnrFormUpdate';
import { isFinalised } from '../list/rnrFormStatus';
import { FinaliseRnrFormAction } from './actions/FinaliseRnrFormAction';

// The detail footer (spec/rnr-forms/ui-surface.md S3 § footer): the
// Draft → Finalised lifecycle indicator and the Finalise action (its confirm
// machine lives in detail/actions/). No Close (D103): leaving the form is the
// breadcrumb's job, in the app bar, where every other screen puts it.

export const RnrFormStatusFooter: Component<{
  node: RnrFormNode;
  /** Any draft line currently violating the balance rules. */
  hasErrorLines: () => boolean;
  /** Scroll the table to the first error line (the errors phase's confirm). */
  onShowFirstError: () => void;
  /** Flush edits, finalise, splice the result; resolves false on failure. */
  onFinalise: () => Promise<boolean>;
}> = props => {

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
