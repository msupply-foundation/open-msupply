/*
 * The patient toolbar trigger slot's region (kdd/custom-forms/specs.md § Forms
 * in the UI, trigger slots; implementation-plan H10b): the buttons plugins
 * place on the patient screen's header. The host owns the place and draws
 * each button in its own style from the contribution's label and icon; the
 * plugin supplies the entry, which gates on the session (`when`, as on every
 * slot) and on the patient (`visible`), and a handler the host runs with the
 * actions it offers here.
 *
 * A trigger's label is a key in its plugin's catalogue, resolved under the
 * plugin's namespace. A `visible` or `onClick` that throws hides or does
 * nothing for that trigger alone, and is named in diagnostics.
 */
import { createMemo, For, Show, type JSX } from 'solid-js';
import { t } from '../intl';
import { Button } from '../ui/elements/buttons/Button';
import { namespacedPluginKey } from '../plugin-sdk/intl';
import type {
  PatientTriggerActions,
  PatientTriggerProps,
} from '../plugin-sdk/types';
import { contributionId, visibleContributions } from './PluginSlot';
import type { RegisteredContribution } from './registry';
import { recordPluginDiagnostic } from './diagnostics';

export interface PatientToolbarTriggersProps {
  props: PatientTriggerProps;
  /**
   * The screen's `openDocumentForm`, told which plugin asked, so a request
   * it refuses is named against that plugin.
   */
  openDocumentForm: (documentType: string, pluginCode: string) => void;
}

type Trigger = RegisteredContribution<'patient.toolbarTrigger'>;

const failed = (
  trigger: Trigger,
  what: 'visible' | 'onClick',
  error: unknown
) => {
  const id = contributionId(trigger);
  console.error(`patient.toolbarTrigger: ${id} ${what} threw`, error);
  recordPluginDiagnostic({
    level: 'warning',
    pluginCode: trigger.pluginCode,
    message: `patient.toolbarTrigger: ${id} — its ${what} threw, so the trigger ${what === 'visible' ? 'is hidden' : 'did nothing'}`,
  });
};

/** Whether a trigger shows for this patient; one whose gate throws does not. */
export const triggerShows = (
  trigger: Trigger,
  props: PatientTriggerProps
): boolean => {
  if (!trigger.visible) return true;
  try {
    return trigger.visible(props);
  } catch (error) {
    failed(trigger, 'visible', error);
    return false;
  }
};

/**
 * Runs a trigger's handler with the screen's actions, told which plugin
 * asked. A handler that throws does nothing more.
 */
export const runTrigger = (
  trigger: Trigger,
  props: PatientTriggerProps,
  openDocumentForm: PatientToolbarTriggersProps['openDocumentForm']
): void => {
  const actions: PatientTriggerActions = {
    openDocumentForm: ({ documentType }) =>
      openDocumentForm(documentType, trigger.pluginCode),
  };
  try {
    trigger.onClick(props, actions);
  } catch (error) {
    failed(trigger, 'onClick', error);
  }
};

export const PatientToolbarTriggers = (
  props: PatientToolbarTriggersProps
): JSX.Element => {
  // One memo over the registry and the session, so the list's identity is
  // stable and the buttons stay mounted (src/plugins/PluginSlot.tsx).
  const contributions = createMemo(() =>
    visibleContributions('patient.toolbarTrigger')
  );

  return (
    <For each={contributions()}>
      {contribution => (
        <Show when={triggerShows(contribution, props.props)}>
          <Button
            variant="secondary"
            icon={contribution.icon ? <contribution.icon /> : undefined}
            data-testid={`patient-trigger-${contributionId(contribution)}`}
            onClick={() =>
              runTrigger(contribution, props.props, props.openDocumentForm)
            }
          >
            {t(
              namespacedPluginKey(contribution.pluginCode, contribution.label)
            )}
          </Button>
        </Show>
      )}
    </For>
  );
};
