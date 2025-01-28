import { PrescriptionRowFragment } from '@openmsupply-client/invoices/src/Prescriptions';

export type PrescriptionFooterComponentProps = {
  prescriptionData?: PrescriptionRowFragment;
  savePluginData: (data: any) => void;
  setIsPluginDataValid: (isValid: boolean) => void;
};
