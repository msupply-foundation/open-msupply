import { createSignal, For, Show } from 'solid-js';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Button } from '../../ui/elements/buttons/Button';
import { TextArea } from '../../ui/elements/inputs/TextArea';
import { LabelledValue } from '../../ui/elements/typography/LabelledValue';
import { Stack } from '../../ui/layout/Stack/Stack';
import { CatalogueIcon } from '../../ui/icons';
import {
  approvalBlock,
  CURRENT_USER,
  KIND_LABEL,
  type ItemRequest,
  type RequestStatus,
} from './requests';

/*
 * Review one request: read the proposed record, then approve or reject it.
 *
 * Rejecting is a TWO-STEP inside the dialog. The first Reject click reveals a
 * reason field and the confirm stays disabled until something is written. That
 * is deliberate friction: an approval costs one click because the requester
 * needs nothing back, while a rejection costs a sentence because the requester
 * needs to know what to do instead. Making both one click is what produces a
 * queue full of bare "rejected" with nobody able to act on it.
 *
 * Approving is also gated by `approvalBlock`, which forbids approving your own
 * request. The action stays VISIBLE and disabled with the reason shown, rather
 * than being hidden, so the rule is learnable instead of mysterious.
 */

export interface ReviewRequestModalProps {
  /** The request under review; null closes the dialog. */
  request: ItemRequest | null;
  onClose: () => void;
  /** Records the decision. Reason is present only on a rejection. */
  onDecide: (id: string, status: RequestStatus, reason?: string) => void;
}

export const ReviewRequestModal = (props: ReviewRequestModalProps) => {
  const [rejecting, setRejecting] = createSignal(false);
  const [reason, setReason] = createSignal('');

  const close = () => {
    setRejecting(false);
    setReason('');
    props.onClose();
  };

  const block = () => {
    const request = props.request;
    return request ? approvalBlock(request, CURRENT_USER) : undefined;
  };

  const decided = () => props.request?.status !== 'pending';

  const approve = () => {
    const request = props.request;
    if (!request) return;
    props.onDecide(request.id, 'approved');
    close();
  };

  const reject = () => {
    const request = props.request;
    if (!request) return;
    props.onDecide(request.id, 'rejected', reason().trim());
    close();
  };

  return (
    <Dialog
      open={props.request !== null}
      onClose={close}
      title={props.request ? `Review: ${props.request.summary}` : 'Review'}
      icon={<CatalogueIcon />}
      width="form"
      description={
        props.request
          ? `${KIND_LABEL[props.request.kind]}, requested by ${props.request.requestedBy}`
          : undefined
      }
      actionsAlign="end"
      actions={
        <Show when={props.request}>
          {request => (
            <>
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Show when={!decided()}>
                <Show
                  when={rejecting()}
                  fallback={
                    <Button
                      variant="danger"
                      onClick={() => setRejecting(true)}
                    >
                      Reject
                    </Button>
                  }
                >
                  <Button
                    variant="danger"
                    disabled={reason().trim().length === 0}
                    onClick={reject}
                  >
                    Confirm rejection
                  </Button>
                </Show>
                {/* Visible but disabled when blocked, with the reason above:
                    a hidden control teaches nothing. */}
                <Button disabled={block() !== undefined} onClick={approve}>
                  {request().kind === 'import-batch'
                    ? `Approve ${request().itemCount} items`
                    : 'Approve'}
                </Button>
              </Show>
            </>
          )}
        </Show>
      }
    >
      <Show when={props.request}>
        {request => (
          <Stack gap="md">
            {/* What one click actually does, before the buttons are reached. */}
            <Show when={request().kind === 'import-batch'}>
              <Alert severity="warning">
                <b>One decision, {request().itemCount} items.</b> Approving this
                batch writes every row in it to the central catalogue. Reject it
                to send the whole file back to {request().requestedBy}.
              </Alert>
            </Show>

            <Show when={block() && !decided()}>
              {reasonBlocked => (
                <Alert severity="info">{reasonBlocked()}</Alert>
              )}
            </Show>

            <Show when={request().status === 'rejected'}>
              <Alert severity="error">
                <b>Rejected</b> by {request().decidedBy}. {request().reason}
              </Alert>
            </Show>
            <Show when={request().status === 'approved'}>
              <Alert severity="success">
                <b>Approved</b> by {request().decidedBy}. The change is in the
                central catalogue.
              </Alert>
            </Show>

            <Stack gap="sm">
              <For each={request().fields}>
                {field => (
                  <LabelledValue label={field.label} layout="inline">
                    {field.value}
                  </LabelledValue>
                )}
              </For>
            </Stack>

            {/* Revealed by the first Reject click: the requester's route
                forward, which is why it is required. */}
            <Show when={rejecting()}>
              <TextArea
                label="Why is this being rejected?"
                required
                rows={3}
                value={reason()}
                onInput={e => setReason(e.currentTarget.value)}
                placeholder="What should the requester do instead?"
                helperText="Sent to the requester. A rejection without a reason leaves them stuck."
              />
            </Show>
          </Stack>
        )}
      </Show>
    </Dialog>
  );
};
