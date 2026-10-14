import { createSignal, Show, type JSX } from 'solid-js';
import { t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { RadioGroup } from '@/ui/elements/inputs/RadioGroup';
import { XCircleIcon } from '@/ui/icons';
import type { FormRegistryFragment } from '@/domain/documentForm/documentForm.generated';

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
 * The program picker, New program's first step (spec/program-enrolment
 * ui-surface S2, rules § enrolling a patient): the programs the user may view
 * at this store, by name, one to enrol in. A program the patient is already
 * enrolled in stays listed, disabled and marked Enrolled, rather than hidden,
 * so the list reads the same for every patient; the server refuses a second
 * enrolment in any case. Enrol opens the enrolment (./EnrolmentModal.tsx).
 */
export const ProgramPickerDialog = (
  props: ProgramPickerDialogProps
): JSX.Element => (
  <Show when={props.open}>
    <ProgramPickerBody {...props} />
  </Show>
);

const programName = (r: FormRegistryFragment): string =>
  r.name ?? r.documentType;

const byName = (a: FormRegistryFragment, b: FormRegistryFragment): number =>
  programName(a).localeCompare(programName(b));

const ProgramPickerBody = (props: ProgramPickerDialogProps): JSX.Element => {
  const [picked, setPicked] = createSignal<string>();
  // In name order (PAT-04 `.1`); the server lists them by id.
  const options = () =>
    [...props.registries].sort(byName).map(r => {
      const enrolled = props.enrolledTypes.has(r.documentType);
      return {
        value: r.id,
        label: programName(r),
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
            data-testid="dialog-button-cancel"
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
