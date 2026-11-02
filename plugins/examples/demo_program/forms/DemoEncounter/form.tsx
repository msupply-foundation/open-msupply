/*
 * The demo program's encounter form (kdd/custom-forms/implementation-plan.md
 * § The demo program; P2): contributed to `encounter.form` for
 * `DemoEncounter`, so it is the body of the encounter record screen for this
 * type. The screen's toolbar edits the visit date, clinician and status on the
 * same draft; the form holds the program's own fields under
 * `extension.demo`, with a BMI worked out from the vitals as they are typed.
 *
 * Saving writes the regimen and the next visit that the type's event rules
 * (events.json) turn into the enrolment's current regimen and follow-up
 * status, on the server.
 */
import type { JSX } from 'solid-js';
import {
  DateInput,
  FieldGroup,
  FormColumn,
  FormRow,
  NumberInput,
  SelectInput,
  TextAreaInput,
  TextField,
  formatNumber,
  type EncounterFormProps,
} from '@openmsupply/plugin-sdk';
import { intl } from '../../intl';
import { bmi } from './bmi';
import { regimenLabels } from './labels';
import type { DemoEncounter } from './type';

export const DemoEncounterForm = (
  props: EncounterFormProps<DemoEncounter>
): JSX.Element => {
  const bodyMassIndex = () =>
    bmi(
      props.draft.get('extension.demo.vitals.weightKg'),
      props.draft.get('extension.demo.vitals.heightCm')
    );

  return (
    <FormColumn>
      <FieldGroup title={intl.t('group.vitals')}>
        <FormRow>
          <NumberInput
            draft={props.draft}
            path="extension.demo.vitals.weightKg"
            label={intl.t('field.weight')}
            unit={intl.t('unit.kg')}
            min={0}
            decimalLimit={1}
            testId="demo-weight"
          />
          <NumberInput
            draft={props.draft}
            path="extension.demo.vitals.heightCm"
            label={intl.t('field.height')}
            unit={intl.t('unit.cm')}
            min={0}
            decimalLimit={0}
            testId="demo-height"
          />
          <TextField
            label={intl.t('field.bmi')}
            value={formatNumber(bodyMassIndex())}
            disabled
            data-testid="demo-bmi"
          />
        </FormRow>
      </FieldGroup>
      <FieldGroup title={intl.t('group.treatment')}>
        <SelectInput
          draft={props.draft}
          path="extension.demo.regimen"
          label={intl.t('field.regimen')}
          options={regimenLabels()}
          testId="demo-regimen"
        />
        <DateInput
          draft={props.draft}
          path="extension.demo.nextVisit"
          label={intl.t('field.next-visit')}
          helperText={intl.t('helper.next-visit')}
          testId="demo-next-visit"
        />
      </FieldGroup>
      <FieldGroup title={intl.t('group.notes')}>
        <TextAreaInput
          draft={props.draft}
          path="extension.demo.notes"
          label={intl.t('field.visit-notes')}
          rows={4}
          testId="demo-visit-notes"
        />
      </FieldGroup>
    </FormColumn>
  );
};
