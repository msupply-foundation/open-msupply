import {
  createEffect,
  createResource,
  createSignal,
  For,
  Show,
} from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { Alert } from '../../../ui/elements/feedback/Alert';
import {
  PlusCircleIcon,
  TrashIcon,
  XCircleIcon,
  SaveIcon,
} from '../../../ui/icons';
import { t, locale } from '../../../intl';
import {
  addSupplyLevel,
  buildSupplyLevelInput,
  supplyLevelsInUse,
} from './propertySets';
import {
  ConfigureNameProperties,
  StoreProperties,
} from './nameProperties.generated';
import styles from '../Settings.module.css';

/*
 * S4 — Configure supply levels (spec/settings/ui-surface.md § S4): edit the
 * allowed values of the one supply-level property. A value currently recorded
 * against at least one store cannot be removed (its remove control is
 * disabled) and duplicates are prevented before saving (AC-CN6). A failed
 * save shows `error.failed-to-save-supply-level` and the modal stays open
 * with entries intact (ui-standards controls › dialogs).
 */
export const SupplyLevelsModal = (props: {
  open: boolean;
  /** Current allowed values from the nameProperties catalogue. */
  initialValues: string[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const params = useParams<{ storeId: string }>();
  const [values, setValues] = createSignal<string[]>([]);
  const [input, setInput] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [saveFailed, setSaveFailed] = createSignal(false);

  // Seed the working list each time the editor opens (a cancelled edit never
  // leaks into the next open).
  createEffect(() => {
    if (props.open) {
      setValues(props.initialValues);
      setInput('');
      setSaveFailed(false);
    }
  });

  // The in-use set: every store's recorded properties JSON, parsed for the
  // supply-level key (AC-CN6; the consumed query carries a ⚠️ VERIFY in the
  // spec — see contract § Configuration). Read via the .state gate, never
  // suspending — this resource first fetches on an interaction, inside an
  // open <dialog> (kdd/solid-reactivity-pitfalls § no remounts, hard gate).
  const [inUseData] = createResource(
    () => (props.open ? params.storeId : undefined),
    async storeId => {
      const result = await graphqlFetch(
        StoreProperties,
        { storeId },
        { background: true }
      );
      return result.kind === 'success'
        ? supplyLevelsInUse(result.data.names.nodes.map(n => n.properties))
        : [];
    }
  );
  const inUse = () =>
    inUseData.state === 'ready' || inUseData.state === 'refreshing'
      ? (inUseData.latest ?? [])
      : [];

  const add = () => {
    setValues(addSupplyLevel(values(), input()));
    setInput('');
  };

  const remove = (value: string) =>
    setValues(values().filter(v => v !== value));

  const save = async () => {
    setSaving(true);
    setSaveFailed(false);
    // Opt into local error handling: a failed save keeps the modal open with
    // entries intact and its own inline message, rather than the global
    // surfaces (spec S4).
    const result = await graphqlFetch(
      ConfigureNameProperties,
      { input: buildSupplyLevelInput(values(), locale()) },
      { background: true, returnGraphqlErrors: true }
    );
    setSaving(false);
    if (
      result.kind === 'success' &&
      result.data.centralServer.general.configureNameProperties.success
    ) {
      props.onSaved();
      props.onClose();
    } else {
      setSaveFailed(true);
    }
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t('title.configure-supply-levels')}
      widthRem={34}
      testId="supply-levels-modal"
      dismissable={!saving()}
      actions={
        <>
          <Show when={!saving()}>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              onClick={props.onClose}
              data-testid="dialog-button-cancel"
            >
              {t('button.cancel')}
            </Button>
          </Show>
          <Button
            icon={<SaveIcon />}
            loading={saving()}
            onClick={() => void save()}
            data-testid="dialog-button-ok"
          >
            {t('button.save')}
          </Button>
        </>
      }
    >
      <Show
        when={values().length > 0}
        fallback={<p>{t('label.no-supply-levels-configured')}</p>}
      >
        <div data-testid="supply-level-list">
          <For each={values()}>
            {value => {
              const isInUse = () => inUse().includes(value);
              return (
                <div class={styles.chipRow}>
                  <span class={styles.chipValue}>
                    {value}
                    <Show when={isInUse()}>
                      {' '}
                      <span class={styles.inUseTag}>({t('label.in-use')})</span>
                    </Show>
                  </span>
                  <IconButton
                    icon={<TrashIcon />}
                    label={t('label.delete-supply-level')}
                    variant="danger"
                    disabled={isInUse() || saving()}
                    onClick={() => remove(value)}
                  />
                </div>
              );
            }}
          </For>
        </div>
      </Show>
      <div class={styles.addRow}>
        <TextField
          label={t('label.add-supply-level')}
          hideLabel
          value={input()}
          onInput={e => setInput(e.currentTarget.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          disabled={saving()}
          data-testid="supply-level-input"
        />
        <IconButton
          icon={<PlusCircleIcon />}
          label={t('label.add-supply-level')}
          disabled={input().trim() === '' || saving()}
          onClick={add}
        />
      </div>
      <Show when={saveFailed()}>
        <Alert severity="error">{t('error.failed-to-save-supply-level')}</Alert>
      </Show>
    </Dialog>
  );
};
