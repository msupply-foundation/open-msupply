/*
 * The demo encounter form as it was at schema version 1 — an ARCHIVED form
 * (kdd/custom-forms/specs.md § Opening an older document). The host renders
 * it, read-only, for encounters recorded under v1, so they show exactly as
 * they were recorded; Edit then migrates the encounter (./migrations.ts) and
 * opens the current form (./form.tsx).
 *
 * Written against the v1 type (./v1.ts), so the compiler holds it to the
 * paths v1 documents actually have: weight and height directly under
 * `extension.demo`, the `LEGACY_TRIAL` regimen, the adherence notes. Kept
 * compiling against the current SDK; dropping it is always safe, since v1
 * encounters then open in the current form after migration.
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
  type EncounterFormProps,
} from '@openmsupply/plugin-sdk';
import { intl } from '../../intl';
import { regimenLabelsV1 } from './labels';
import type { DemoEncounterV1 } from './v1';

export const DemoEncounterV1Form = (
  props: EncounterFormProps<DemoEncounterV1>
): JSX.Element => (
  <FormColumn>
    <FieldGroup title={intl.t('group.visit')}>
      <FormRow>
        <NumberInput
          draft={props.draft}
          path="extension.demo.weightKg"
          label={intl.t('field.weight')}
          unit={intl.t('unit.kg')}
          decimalLimit={1}
          testId="demo-v1-weight"
        />
        <NumberInput
          draft={props.draft}
          path="extension.demo.heightCm"
          label={intl.t('field.height')}
          unit={intl.t('unit.cm')}
          decimalLimit={0}
          testId="demo-v1-height"
        />
      </FormRow>
      <SelectInput
        draft={props.draft}
        path="extension.demo.regimen"
        label={intl.t('field.regimen')}
        options={regimenLabelsV1()}
        testId="demo-v1-regimen"
      />
      <DateInput
        draft={props.draft}
        path="extension.demo.nextVisit"
        label={intl.t('field.next-visit')}
        testId="demo-v1-next-visit"
      />
    </FieldGroup>
    <FieldGroup title={intl.t('group.notes')}>
      <TextAreaInput
        draft={props.draft}
        path="extension.demo.notes"
        label={intl.t('field.visit-notes')}
        rows={3}
        testId="demo-v1-visit-notes"
      />
      <TextAreaInput
        draft={props.draft}
        path="extension.demo.adherence"
        label={intl.t('field.adherence')}
        rows={3}
        testId="demo-v1-adherence"
      />
    </FieldGroup>
  </FormColumn>
);
