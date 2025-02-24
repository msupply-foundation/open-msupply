import { PrescriptionRowFragment } from '@openmsupply-client/invoices/src/Prescriptions';
import { UsePluginEvents } from './usePluginEvents';

export type PrescriptionPaymentComponentProps = {
  prescriptionData: PrescriptionRowFragment;
  totalToBePaidByInsurance: number;
  totalToBePaidByPatient: number;
  events: UsePluginEvents<{ isDirty: boolean }>;
};
