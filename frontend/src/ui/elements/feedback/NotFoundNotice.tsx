import type { Component } from 'solid-js';
import { Dialog } from './Dialog';
import { OkButton } from '../buttons/StandardButtons';
import { InfoIcon } from '../../icons';

export interface NotFoundNoticeProps {
  /** The dialog's test id — `<record>-not-found-notice` (e2e/TESTIDS.md). */
  testId: string;
  /** The heading — "<Record> not found". */
  title: string;
  /** The one line under it, saying what OK does. */
  description: string;
  /**
   * OK and Escape both call this. The consumer decides where it goes — a
   * detail screen goes back to its list.
   */
  onClose: () => void;
}

/**
 * The notice a detail screen shows when the id in its URL is no record of its
 * kind (ui-standards › detail views § not found): an acknowledgement with a
 * single OK (ui-standards › controls § an acknowledgement has nothing to
 * cancel). It is open while mounted, so mount it only where the miss applies —
 * typically a `<Show>` fallback behind the read's `!loading`, so a reload
 * never flashes it.
 */
export const NotFoundNotice: Component<NotFoundNoticeProps> = props => (
  <Dialog
    open
    testId={props.testId}
    icon={<InfoIcon />}
    title={props.title}
    description={props.description}
    onClose={() => props.onClose()}
    actions={
      <OkButton
        data-testid="dialog-button-ok"
        onClick={() => props.onClose()}
      />
    }
  />
);
