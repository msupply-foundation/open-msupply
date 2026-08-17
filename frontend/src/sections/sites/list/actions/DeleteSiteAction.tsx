import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { SiteDeleteFlow } from './SiteDeleteFlow';
import { siteDeletable, type SiteRow } from '../siteEdit';

// The EDITOR's Delete (spec/sites/ui-surface.md S2 § layout): on the footer's
// inline start, standalone-only, existing sites only, and disabled while the
// site still shows any store — the UI mirror of the server's `SiteHasStores`
// refusal (OMS-FUN-SYC-002.37). It opens the same confirmation as the
// register's bulk action, over a count of one, and closes the editor on success
// (OMS-FUN-SYC-002.38 — moving every store off makes a site deletable).

export interface DeleteSiteActionProps {
  site: SiteRow;
  /**
   * How many stores the editor currently shows for the site (draft included).
   */
  assignedStoreCount: number;
  disabled?: boolean;
  /** The site is gone: close the editor and re-read the register. */
  onDeleted: () => void;
}

export const DeleteSiteAction: Component<DeleteSiteActionProps> = props => {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <Button
        variant="danger"
        data-testid="delete-site-button"
        disabled={props.disabled || !siteDeletable(props.assignedStoreCount)}
        onClick={() => setOpen(true)}
      >
        {t('button.delete-lines')}
      </Button>
      <Show when={open()}>
        <SiteDeleteFlow
          rows={[props.site]}
          onCancel={() => setOpen(false)}
          onAllDeleted={() => {
            setOpen(false);
            props.onDeleted();
          }}
          // A count of one has nothing to partially succeed at: the single
          // refusal lands in the report, and dismissing it leaves the editor
          // open so the user can move the blocking stores off.
          onPartiallyDeleted={() => undefined}
          onReportDismissed={() => setOpen(false)}
        />
      </Show>
    </>
  );
};
