/*
 * The vaccination encounter's form for this frontend
 * (kdd/custom-forms/implementation-plan.md § From review, P4): contributed to
 * `encounter.form` for `VaccinationEncounter`, the type the plugin took
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
import type { VaccinationEncounter, VaccineManufacturer } from './type';

/*
 * Brand names, shown as recorded, and "Other" in the user's language. Typed
 * over the union, so a manufacturer the type gains is a compile error here
 * until it is listed.
 */
const manufacturers = (): Record<VaccineManufacturer, string> => ({
  Moderna: 'Moderna',
  Pfizer: 'Pfizer',
  'Astra-Zeneca': 'Astra-Zeneca',
  Sinovac: 'Sinovac',
  'Johnson & Johnson': 'Johnson & Johnson',
  Novavax: 'Novavax',
  Other: intl.t('manufacturer.other'),
});

export const VaccinationEncounterForm = (
  props: EncounterFormProps<VaccinationEncounter>
): JSX.Element => (
  <FormColumn>
    <FieldGroup title={intl.t('group.vaccination-services')}>
      <CheckboxInput
        draft={props.draft}
        path="extension.clientOfferedVaccination"
        label={intl.t('field.offered-vaccination')}
        testId="vaccination-offered"
      />
      <CheckboxInput
        draft={props.draft}
        path="extension.declined"
        label={intl.t('field.declined')}
        testId="vaccination-declined"
      />
      <TextInput
        draft={props.draft}
        path="extension.reasonForDecline"
        label={intl.t('field.reason-for-decline')}
        disabled={props.draft.get('extension.declined') !== true}
        testId="vaccination-reason"
      />
    </FieldGroup>
    <FieldGroup title={intl.t('group.vaccination-event')}>
      <DateInput
        draft={props.draft}
        path="extension.vaccinationDate"
        label={intl.t('field.vaccination-date')}
        testId="vaccination-date"
      />
      <SelectInput
        draft={props.draft}
        path="extension.manufacturer"
        label={intl.t('field.manufacturer')}
        options={manufacturers()}
        // No longer given, but the brand a record holds is a fact about that
        // visit, so the record keeps showing it; it is just not offered again.
        // The type still lists it, so the old client can still record it.
        retired={['Astra-Zeneca']}
        testId="vaccination-manufacturer"
      />
      <TextInput
        draft={props.draft}
        path="extension.batchNumber"
        label={intl.t('field.batch-number')}
        testId="vaccination-batch"
      />
    </FieldGroup>
  </FormColumn>
);
