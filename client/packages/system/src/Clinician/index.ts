import { InsertClinicianInput } from '@common/types';

export * from './utils';
export * from './ClinicianSearchInput';
export * from './ListView';
export * from './Service';

export type DraftClinician = Omit<InsertClinicianInput, 'id'>;
