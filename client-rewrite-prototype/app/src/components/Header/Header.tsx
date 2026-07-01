import { TruckIcon, PlusCircleIcon, MenuIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from './Breadcrumbs';
import { ExportButton } from './ExportButton';
import { FilterBar } from './FilterBar';
import styles from './Header.module.css';

interface HeaderProps {
  /** In overlay mode the header shows a hamburger to open the nav. */
  isNavOverlay?: boolean;
  onOpenNav?: () => void;
}

/*
 * Page header. Two stacked zones, mirroring the current app's AppBar:
 *  - top row: (hamburger, overlay mode only) + breadcrumb + actions
 *  - content row: the filter bar
 * The top row and filter bar WRAP intrinsically (flex-wrap) — no breakpoints for
 * spacing/layout; the only responsive switch is the hamburger, driven by the
 * nav-overlay breakpoint in App.
 */
export const Header = ({ isNavOverlay = false, onOpenNav }: HeaderProps) => (
  <header className={styles.header}>
    <div className={styles.topRow}>
      <div className={styles.lead}>
        {isNavOverlay && (
          <button
            type="button"
            className={styles.hamburger}
            onClick={onOpenNav}
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
        )}
        <Breadcrumbs
          icon={<TruckIcon />}
          crumbs={[{ label: 'Outbound Shipments' }]}
        />
      </div>
      <div className={styles.actions}>
        <Button icon={<PlusCircleIcon />}>New shipment</Button>
        <ExportButton />
      </div>
    </div>
    <div className={styles.contentRow}>
      <FilterBar />
    </div>
  </header>
);
