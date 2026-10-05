/*
 * The COVID-19 vaccination encounter's form for this frontend
 * (kdd/custom-forms/implementation-plan.md § From review, P4): contributed to
 * `encounter.form` for `HIVCareCovid19Encounter`, the type the plugin took
 * over from a deployment. It is written from scratch, as every plugin form is;
 * the deployment's JSON Forms UI schema (`legacy-ui.json`) is carried only for
 * sites still on the old client, and nothing here reads it.
 *
 * The two groups follow the old form's two tabs, and its one rule is plain
 * code: the reason for declining can be entered only once "Declined" is
 * ticked.
 */
import type { JSX } from 'solid-js';
import {
  CheckboxInput,
  DateInput,
  FieldGroup,
  FormColumn,
  SelectInput,
  TextInput,
  type EncounterFormProps,
} from '@openmsupply/plugin-sdk';
import { intl } from '../../intl';
import type { Covid19Encounter, Covid19Manufacture } from './type';

/*
 * Brand names, shown as recorded. Typed over the union, so a manufacturer the
 * type gains is a compile error here until it is listed.
 */
const manufacturers: Record<Covid19Manufacture, string> = {
  Moderna: 'Moderna',
  Pfizer: 'Pfizer',
  'Astra-Zeneca': 'Astra-Zeneca',
  Sinovac: 'Sinovac',
  'Johnson & Johnson': 'Johnson & Johnson',
  Novavax: 'Novavax',
  Other: 'Other',
};

export const Covid19EncounterForm = (
  props: EncounterFormProps<Covid19Encounter>
): JSX.Element => (
  <FormColumn>
    <FieldGroup title={intl.t('group.covid-services')}>
      <CheckboxInput
        draft={props.draft}
        path="extension.clientOfferedVaccination"
        label={intl.t('field.offered-vaccination')}
        testId="covid-offered"
      />
      <CheckboxInput
        draft={props.draft}
        path="extension.declined"
        label={intl.t('field.declined')}
        testId="covid-declined"
      />
      <TextInput
        draft={props.draft}
        path="extension.reasonForDecline"
        label={intl.t('field.reason-for-decline')}
        disabled={props.draft.get('extension.declined') !== true}
        testId="covid-reason"
      />
    </FieldGroup>
    <FieldGroup title={intl.t('group.covid-event')}>
      <DateInput
        draft={props.draft}
        path="extension.vaccinationDate"
        label={intl.t('field.vaccination-date')}
        testId="covid-date"
      />
      <SelectInput
        draft={props.draft}
        path="extension.manufacturer"
        label={intl.t('field.manufacturer')}
        options={manufacturers}
        testId="covid-manufacturer"
      />
      <TextInput
        draft={props.draft}
        path="extension.batchNumber"
        label={intl.t('field.batch-number')}
        testId="covid-batch"
      />
    </FieldGroup>
  </FormColumn>
);
