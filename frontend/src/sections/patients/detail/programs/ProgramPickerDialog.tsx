import { createSignal, Show, type JSX } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { RadioGroup } from '../../../../ui/elements/inputs/RadioGroup';
import { XCircleIcon } from '../../../../ui/icons';
import type { FormRegistryFragment } from '../../../../domain/documentForm/documentForm.generated';

export interface ProgramPickerDialogProps {
  open: boolean;
  /** The ProgramEnrolment registry entries the user may see in this store. */
  registries: FormRegistryFragment[];
  /** Document types the patient is already enrolled in. */
  enrolledTypes: ReadonlySet<string>;
  onPick: (registry: FormRegistryFragment) => void;
  onClose: () => void;
}

/*
 * The first step of "New program" (implementation-plan H8, as the old
 * client's program search): the programs the registry offers, one to enrol
 * in. A program the patient is already enrolled in stays listed, disabled and
 * marked, rather than hidden, so the list reads the same for every patient;
 * the server refuses a second enrolment in any case. Picking opens the
 * enrolment form.
 */
export const ProgramPickerDialog = (
  props: ProgramPickerDialogProps
): JSX.Element => (
  <Show when={props.open}>
    <ProgramPickerBody {...props} />
  </Show>
);

const ProgramPickerBody = (props: ProgramPickerDialogProps): JSX.Element => {
  const [picked, setPicked] = createSignal<string>();
  const options = () =>
    props.registries.map(r => {
      const enrolled = props.enrolledTypes.has(r.documentType);
      return {
        value: r.id,
        label: r.name ?? r.documentType,
        description: enrolled ? t('label.enrolled') : undefined,
        disabled: enrolled,
        testId: `program-option-${r.documentType}`,
      };
    });
  const enrol = () => {
    const registry = props.registries.find(r => r.id === picked());
    if (registry) props.onPick(registry);
  };

  return (
    <Dialog
      open
      width="prose"
      onClose={props.onClose}
      title={t('heading.enrol-in-program')}
      testId="program-picker"
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            confirms="cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            confirms="plain"
            data-testid="program-picker-enrol"
            disabled={picked() === undefined}
            onClick={enrol}
          >
            {t('button.enrol')}
          </Button>
        </>
      }
    >
      <Show
        when={props.registries.length > 0}
        fallback={
          <Alert severity="info">{t('messages.no-programs-configured')}</Alert>
        }
      >
        <RadioGroup
          label={t('label.programs')}
          options={options()}
          value={picked()}
          onChange={setPicked}
        />
      </Show>
    </Dialog>
  );
};
