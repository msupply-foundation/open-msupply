import { createSignal } from 'solid-js';
import type { Component } from 'solid-js';
import { t } from '@/intl';
import { StatusIndicator } from '@/ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import {
  ContentFooterMessage,
  type FooterMessage,
} from '@/ui/layout/ContentFooter/ContentFooterMessage';
import type { RnrFormNode } from './rnrFormUpdate';
import { isFinalised } from '../list/rnrFormStatus';
import { FinaliseRnrFormAction } from './actions/FinaliseRnrFormAction';

// The detail footer (spec/rnr-forms/ui-surface.md S3 § footer): the
// Draft → Finalised lifecycle indicator and the Finalise action (its confirm
// machine lives in detail/actions/). No Close (D103): leaving the form is the
// breadcrumb's job, in the app bar, where every other screen puts it.
// A finalise that lands hides the action, so the bar's message slot flashes
// the current app's confirmation (spec/ui-standards/controls.md § action
// feedback).

export const RnrFormStatusFooter: Component<{
  node: RnrFormNode;
  /** Any draft line currently violating the balance rules. */
  hasErrorLines: () => boolean;
  /** Scroll the table to the first error line (the errors phase's confirm). */
  onShowFirstError: () => void;
  /** Flush edits, finalise, splice the result; resolves false on failure. */
  onFinalise: () => Promise<boolean>;
}> = props => {
  const [outcome, setOutcome] = createSignal<FooterMessage>();

  const finalised = () => isFinalised(props.node.status);

  // The view's finalise, reporting a success in the message slot.
  const finalise = async (): Promise<boolean> => {
    const finalisedNow = await props.onFinalise();
    if (finalisedNow)
      setOutcome({ type: 'success', text: t('status.finalised') });
    return finalisedNow;
  };

  // Draft carries its reached-at datetime for the history popover; the schema
  // exposes no finalised stamp, so that step legitimately stays undated.
  const steps = () => [
    { label: t('label.draft'), date: props.node.createdDatetime },
    { label: t('label.finalised') },
  ];

  return (
    <ContentFooter>
      <StatusIndicator
        recordId={props.node.id}
        steps={steps()}
        current={finalised() ? 1 : 0}
      />
      <ContentFooterMessage message={outcome()} />
      <ContentFooterActions>
        <FinaliseRnrFormAction
          node={props.node}
          hasErrorLines={props.hasErrorLines}
          onShowFirstError={props.onShowFirstError}
          onFinalise={finalise}
        />
      </ContentFooterActions>
    </ContentFooter>
  );
};
