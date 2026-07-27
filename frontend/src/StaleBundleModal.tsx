import type { Component } from 'solid-js';
import { reloadForStaleBundle, staleBundleDetected } from './staleBundle';
import { t } from './intl';
import { Dialog } from './ui/elements/feedback/Dialog';
import { Button } from './ui/elements/buttons/Button';
import { SyncIcon } from './ui/icons';

// Spec (issue #496): shown only when a stale chunk 404s a second time in the
// same tab (staleBundle.ts already reloaded once automatically and that
// didn't clear it) — same non-dismissable, reload-to-recover shape as
// UnexpectedErrorModal, but naming the actual cause (a newer build is live)
// instead of the generic "something's gone wrong".
export const StaleBundleModal: Component = () => (
  <Dialog
    open={staleBundleDetected()}
    dismissable={false}
    onClose={() => {}}
    title={t('error.new-version-available')}
    icon={<SyncIcon />}
    description={t('error.new-version-available-detail')}
    actions={
      <Button variant="secondary" onClick={reloadForStaleBundle}>
        {t('button.refresh')}
      </Button>
    }
  />
);
