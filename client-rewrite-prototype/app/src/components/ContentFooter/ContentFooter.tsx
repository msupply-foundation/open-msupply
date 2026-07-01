import { Button } from '@/components/ui/Button';
import { ClockIcon, XCircleIcon, SaveIcon } from '@/components/icons';
import styles from './ContentFooter.module.css';

/*
 * Content footer — the page's action bar (see the current app's detail-view
 * footers). Pinned at the bottom of the content area, ABOVE the orange app
 * footer, and does NOT scroll with the body. Blue (secondary) action buttons:
 * one on the inline-start, Cancel + Save on the inline-end.
 */
export const ContentFooter = () => (
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
      <Button color="blue" icon={<SaveIcon />}>
        Save
      </Button>
    </div>
  </div>
);
