import type { Component } from 'solid-js';
import { unexpectedError } from './api/graphql';
import { t } from './intl';
import { Dialog } from './ui/elements/feedback/Dialog';
import { Button } from './ui/elements/buttons/Button';
import { AlertCircleIcon } from './ui/icons';

// Spec (Unexpected API Errors): global modal with the error description, on top of
// everything else. The flow that hit the error remains in its loading phase. Two
// recovery actions, both a full-page navigation (so the app restarts from a clean
// state, and the modal stays router-agnostic): reload the current URL in place, or
// go to the root — which resolves the store and lands on the dashboard. Not
// dismissable — recovery IS one of the two navigations.
export const UnexpectedErrorModal: Component = () => (
  <Dialog
    open={Boolean(unexpectedError())}
    dismissable={false}
    onClose={() => {}}
    title={t('error.unexpected')}
    icon={<AlertCircleIcon />}
    description={unexpectedError()}
    actions={
      <>
        <Button variant="secondary" onClick={() => location.reload()}>
          {t('error.reload')}
        </Button>
        <Button variant="secondary" onClick={() => (location.href = '/')}>
          {t('error.go-to-dashboard')}
        </Button>
      </>
    }
  />
);
