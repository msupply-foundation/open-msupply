import { Show, type JSX } from 'solid-js';
import { HomeIcon } from '../../icons';
import styles from './RecordNameHeader.module.css';

/*
 * RecordNameHeader — the centred, emphasised record-name header at the top of a
 * detail form (spec/ui-standards/detail-views). Shows a store indicator (home
 * icon) when the record is itself a store. Generic: the caller supplies the
 * store-indicator accessible name (`storeLabel`) so the library carries no
 * vertical-specific locale key.
 */
export const RecordNameHeader = (props: {
  name: string;
  isStore?: boolean;
  storeLabel?: string;
}): JSX.Element => (
  <div class={styles.header}>
    <Show when={props.isStore}>
      <span class={styles.icon}>
        <HomeIcon aria-label={props.storeLabel} />
      </span>
    </Show>
    <span class={styles.name}>{props.name}</span>
  </div>
);
