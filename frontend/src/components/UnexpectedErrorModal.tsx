import { Show } from 'solid-js';
import type { Component } from 'solid-js';
import { unexpectedError } from '../api/graphql';
import { t } from '../intl';
import styles from '../styles/shared.module.css';

// Spec (Unexpected API Errors): global modal with the error description, on top of
// everything else. The flow that hit the error remains in its loading phase. Two
// recovery actions, both a full-page navigation (so the app restarts from a clean
// state, and the modal stays router-agnostic): reload the current URL in place, or
// go to the root — which resolves the store and lands on the dashboard.
export const UnexpectedErrorModal: Component = () => (
  <Show when={unexpectedError()}>
    <div class={styles.overlay}>
      <div class={styles.modal}>
        <h2>{t('error.unexpected')}</h2>
        <p class={styles.errorText}>{unexpectedError()}</p>
        <button class={styles.button} type="button" onClick={() => location.reload()}>
          {t('error.reload')}
        </button>
        <button class={styles.button} type="button" onClick={() => (location.href = '/')}>
          {t('error.go-to-dashboard')}
        </button>
      </div>
    </div>
  </Show>
);
