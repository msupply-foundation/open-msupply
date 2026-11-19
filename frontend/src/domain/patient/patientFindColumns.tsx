import { t } from '../../intl';
import { type Column } from '../../ui/elements/table/DataTable';
import { getCellDefinition } from '../../ui/elements/table/tableHelpers';
import { remToPx } from '../../ui/utils/rem';
import { genderLabel } from './gender';
import { ageFromDob } from './age';
import { type PatientFindRow } from './patientFind';

// The columns of a patient search's results (#631 spike; spec/patients S2
// step ①): enough to tell two patients with the same name apart. Shared by the
// search dialog and the create form's review of possible duplicates. No
// sorting: results come back in name order, capped.
export const patientFindColumns = <T extends PatientFindRow>(): Column<
  T,
  never
>[] => [
  {
    c: { key: 'code' },
    header: () => t('label.patient-id'),
    ...getCellDefinition('code', { headerPosition: 'primary' }),
  },
  {
    c: { key: 'firstName' },
    header: () => t('label.first-name'),
    ...getCellDefinition('firstName'),
  },
  {
    c: { key: 'lastName' },
    header: () => t('label.last-name'),
    ...getCellDefinition('lastName'),
  },
  {
    c: { key: 'dateOfBirth' },
    header: () => t('label.date-of-birth'),
    ...getCellDefinition('dateOfBirth'),
  },
  {
    c: { accessor: row => ageFromDob(row.dateOfBirth) ?? '', id: 'age' },
    header: () => t('label.age'),
    meta: { align: 'right' },
    size: remToPx(4),
  },
  {
    c: { key: 'gender' },
    header: () => t('label.gender'),
    ...getCellDefinition('gender'),
    cell: info => {
      const g = info.getValue<PatientFindRow['gender']>();
      return g ? genderLabel(g) : '';
    },
  },
  {
    c: { key: 'address1' },
    header: () => t('label.address'),
    ...getCellDefinition('description'),
  },
];
