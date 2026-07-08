import { type JSX } from 'solid-js'
import { CheckIcon, HelpIcon, XCircleIcon } from '../icons'
import { Button } from './Button'
import { Dialog } from './Dialog'

export interface ConfirmDialogProps {
  open: boolean
  /** Every close path — Cancel, scrim, Escape. OK runs onConfirm first. */
  onClose: () => void
  title?: string
  message: JSX.Element
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
}

/*
 * Confirmation preset built on <Dialog> — the standard "Are you sure?"
 * Cancel/OK pattern (secondary-tone buttons, as in the current app's blue
 * dialog actions). The owning component keeps `open` state, renders this, and
 * handles onConfirm. Ported from the RnD prototype's ConfirmDialog.
 */
export const ConfirmDialog = (props: ConfirmDialogProps) => (
  <Dialog
    open={props.open}
    onClose={props.onClose}
    icon={<HelpIcon />}
    title={props.title ?? 'Are you sure?'}
    description={props.message}
    actions={
      <>
        <Button
          variant="secondary"
          icon={<XCircleIcon />}
          onClick={props.onClose}
        >
          {props.cancelLabel ?? 'Cancel'}
        </Button>
        <Button
          variant="secondary"
          icon={<CheckIcon />}
          onClick={() => {
            props.onConfirm()
            props.onClose()
          }}
        >
          {props.confirmLabel ?? 'OK'}
        </Button>
      </>
    }
  />
)
