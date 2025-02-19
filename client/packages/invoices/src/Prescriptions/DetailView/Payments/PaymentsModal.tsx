import React, {
  ComponentType,
  FC,
  ReactElement,
  ReactNode,
  useEffect,
  useState,
} from 'react';
import {
  BasicTextInput,
  DialogButton,
  InputWithLabelRow,
} from '@common/components';

import {
  CurrencyInput,
  Grid,
  usePluginEvents,
  usePluginProvider,
} from '@openmsupply-client/common';
import { useDialog } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { usePrescription } from '../../api';
import { usePatient } from '@openmsupply-client/system/src';
import { PrescriptionPaymentComponentProps } from 'packages/common/src/plugins/prescriptionTypes';

interface PaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleConfirm: () => void;
}

export const PaymentsModal: FC<PaymentsModalProps> = ({
  isOpen,
  onClose,
  handleConfirm,
}): ReactElement => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const [policyNumber, setPolicyNumber] = useState<string>();
  const [discountRate, setDiscountRate] = useState(0);
  const [totalToBePaidByInsurance, setTotalToBePaidByInsurance] = useState(0);

  const {
    query: { data: prescriptionData },
  } = usePrescription();

  const nameId = prescriptionData?.patientId ?? '';
  const { data: insuranceData } = usePatient.document.insurances({
    nameId,
  });
  const selectedInsurance = insuranceData?.nodes.find(
    insurance => insurance.policyNumber === policyNumber
  );

  const { plugins } = usePluginProvider();
  const pluginEvents = usePluginEvents({
    isDirty: false,
  });

  const primaryPlugins = plugins.prescriptionPaymentForm?.slice(0, 2);
  const secondaryPlugins = plugins.prescriptionPaymentForm?.slice(2);

  const renderPlugins = (
    plugins: ComponentType<PrescriptionPaymentComponentProps>[] | undefined
  ): ReactNode => {
    return plugins?.map((Plugin, index) =>
      prescriptionData ? (
        <Grid key={index} size={{ xs: 12 }}>
          <Plugin
            prescriptionData={prescriptionData}
            totalToBePaidByInsurance={totalToBePaidByInsurance}
            totalToBePaidByPatient={
              prescriptionData.pricing.totalAfterTax - totalToBePaidByInsurance
            }
            events={pluginEvents}
          />
        </Grid>
      ) : null
    );
  };

  const onSave = async () => {
    if (!prescriptionData) return;

    await pluginEvents.dispatchEvent({ id: prescriptionData.id });
    handleConfirm();
    onClose();
  };

  useEffect(() => {
    if (!prescriptionData) return;
    const totalAfterTax = prescriptionData?.pricing.totalAfterTax ?? 0;
    const discountPercentage = selectedInsurance?.discountPercentage ?? 0;

    setDiscountRate(discountPercentage);
    const discountAmount = (totalAfterTax * discountPercentage) / 100;
    setTotalToBePaidByInsurance(discountAmount);
  }, [selectedInsurance]);

  return (
    <Modal
      width={700}
      title={t('title.payment')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={<DialogButton variant="save" onClick={onSave} />}
      sx={{
        '& .MuiDialogContent-root': { display: 'flex', alignItems: 'center' },
      }}
    >
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <InputWithLabelRow
            label={t('label.total-to-be-paid')}
            Input={
              <CurrencyInput
                value={prescriptionData?.pricing.totalAfterTax}
                onChangeNumber={() => {}}
                style={{ borderRadius: 4, pointerEvents: 'none' }}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.paid-by-insurance')}
            Input={
              <CurrencyInput
                key={totalToBePaidByInsurance}
                value={totalToBePaidByInsurance}
                onChangeNumber={() => {}}
                style={{ borderRadius: 4, pointerEvents: 'none' }}
              />
            }
            sx={{ pt: 1 }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <InputWithLabelRow
            label={t('label.insurance-scheme')}
            Input={
              <BasicTextInput
                value={selectedInsurance?.policyNumber}
                onChange={event => setPolicyNumber(event.target.value)}
              />
            }
            sx={{ '& .MuiAutocomplete-root': { flexGrow: 1, borderRadius: 1 } }}
          />
          <InputWithLabelRow
            label={t('label.discount-rate')}
            Input={
              <BasicTextInput
                value={`${discountRate}%`}
                sx={{
                  pointerEvents: 'none',
                }}
              />
            }
            sx={{ pt: 1 }}
          />
        </Grid>
        {renderPlugins(primaryPlugins)}
        {renderPlugins(secondaryPlugins)}
      </Grid>
    </Modal>
  );
};
