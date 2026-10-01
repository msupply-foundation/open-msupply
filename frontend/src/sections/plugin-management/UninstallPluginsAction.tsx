import { createSignal, For, Show, untrack, type Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { rejectionFrom } from '@/api/rejection';
import { t, tPlural } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TrashIcon } from '@/ui/icons';
import { UninstallPlugin } from './plugins.generated';
import { runtimeText, type PluginRow } from './pluginRows';
import {
  uninstallRows,
  type RefusedUninstall,
  type UninstallOne,
} from './uninstall';

/*
 * S4 — Uninstall confirmation (spec/plugin-management/ui-surface.md), raised
 * by the selection footer's Delete. Each selected row is uninstalled on its
 * own (rules › uninstalling plugins); the dialog holds until every call has
 * answered, then either closes (all uninstalled) or stays on the refusals.
 * Same mount-while-open shape as the reference vertical's delete action.
 */

export interface UninstallPluginsActionProps {
  /** The selected rows, in list order. */
  selected: () => PluginRow[];
  /**
   * Done — every row uninstalled, or the refusals acknowledged: clear the
   * selection and re-read.
   */
  onUninstalled: () => void;
  /**
   * Some were refused: re-read so the uninstalled rows leave the list, but
   * keep the selection — the footer this dialog lives in must stay mounted
   * while the refusals are read.
   */
  onPartlyUninstalled: () => void;
}

type Phase = 'confirm' | 'running' | 'refused';

export const UninstallPluginsAction: Component<
  UninstallPluginsActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('button.delete-lines')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const uninstallOne: UninstallOne = async id => {
  const result = await graphqlFetch(
    UninstallPlugin,
    { id },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'success') return { ok: true };
  return {
    ok: false,
    rejection:
      result.kind === 'graphqlError'
        ? rejectionFrom(result.errors, '')
        : // Surfaced globally already; the row is still named here.
          { message: '' },
  };
};

const Body = (props: UninstallPluginsActionProps & { onClose: () => void }) => {
  // Snapshotted on open: the confirmation names what was selected then, and
  // cannot shift under the dialog.
  const rows = untrack(() => props.selected());
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [refused, setRefused] = createSignal<RefusedUninstall[]>([]);

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('running');
    const outcome = await uninstallRows(rows, uninstallOne);
    if (outcome.refused.length === 0) {
      // Closing is the confirmation (ui-standards › controls § dialogs); the
      // selection clears last, since it unmounts the footer hosting this.
      props.onClose();
      props.onUninstalled();
      return;
    }
    setRefused(outcome.refused);
    setPhase('refused');
    props.onPartlyUninstalled();
  };

  const message = () =>
    rows.length === 1
      ? t('messages.confirm-delete-plugin', { code: rows[0]?.code ?? '' })
      : tPlural('messages.confirm-delete-plugins', rows.length);

  const describe = (entry: RefusedUninstall) =>
    [entry.row.code, entry.row.version, runtimeText(entry.row)]
      .filter(Boolean)
      .join(' · ') +
    (entry.rejection.message ? `: ${entry.rejection.message}` : '');

  return (
    <Dialog
      open
      dismissable={phase() !== 'running'}
      onClose={() => {
        props.onClose();
        if (phase() === 'refused') props.onUninstalled();
      }}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      title={t('heading.are-you-sure')}
      description={message()}
      actions={
        <Show
          when={phase() === 'refused'}
          fallback={
            <>
              <Show when={phase() === 'confirm'}>
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={props.onClose}
                />
              </Show>
              <Button
                variant="danger"
                confirms="plain"
                data-testid="confirmation-modal-ok"
                loading={phase() === 'running'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        >
          {/* What could be uninstalled has been; there is nothing left to
              cancel — the outcome is acknowledged (controls § footer button
              identity). */}
          <Button
            variant="secondary"
            confirms="plain"
            data-testid="dialog-button-close"
            onClick={() => {
              props.onClose();
              props.onUninstalled();
            }}
          >
            {t('button.close')}
          </Button>
        </Show>
      }
    >
      <Show when={phase() === 'refused'}>
        <Alert severity="error">
          <div data-testid="uninstall-plugins-refused">
            <p>{t('error.unable-to-delete-plugin')}</p>
            <ul>
              <For each={refused()}>{entry => <li>{describe(entry)}</li>}</For>
            </ul>
          </div>
        </Alert>
      </Show>
    </Dialog>
  );
};
