import { InsertClinicianInput } from '@common/types';

export * from './utils';
export * from './ClinicianSearchInput';

export type DraftClinician = Omit<InsertClinicianInput, 'id'>;
