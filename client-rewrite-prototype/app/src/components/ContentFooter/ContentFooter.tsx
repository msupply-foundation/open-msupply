import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ClockIcon,
  CopyIcon,
  MinusCircleIcon,
  SaveIcon,
  TrashIcon,
  XCircleIcon,
} from '@/components/icons';
import { useSelectionFooter } from '@/stores/selectionFooter';
import styles from './ContentFooter.module.css';

/*
 * Content footer — one pinned action bar, whose CONTENT is contextual (Carl,
 * 2026-07-01). With no selection it's the detail-view bar (History / Cancel /
 * Save). When a table publishes a selection (via the selectionFooter store), the
 * same bar becomes the selection-action bar (N selected · Delete · Copy · Clear)
 * — so we never stack two rows of blue buttons. Pinned above the orange app
 * footer; does not scroll with the body.
 */
export const ContentFooter = () => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { count, onDelete, onCopy, onClear } = useSelectionFooter();

  if (count > 0) {
    return (
      <div className={styles.footer}>
        <div className={styles.side}>
          <span className={styles.count}>{count} selected</span>
        </div>
        <div className={styles.side}>
          <Button color="blue" icon={<TrashIcon />} onClick={onDelete}>
            Delete
          </Button>
          <Button color="blue" icon={<CopyIcon />} onClick={onCopy}>
            Make a copy
          </Button>
          <Button color="blue" icon={<MinusCircleIcon />} onClick={onClear}>
            Clear selection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.footer}>
      <div className={styles.side}>
        <Button color="blue" icon={<ClockIcon />}>
          History
        </Button>
      </div>
      <div className={styles.side}>
        <Button color="blue" icon={<XCircleIcon />}>
          Cancel
        </Button>
        <Button
          color="blue"
          icon={<SaveIcon />}
          onClick={() => setConfirmOpen(true)}
        >
          Save
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        message="Save your changes to this shipment?"
        onConfirm={() => {
          // Mockup: this is where the save would fire.
        }}
      />
    </div>
  );
};
