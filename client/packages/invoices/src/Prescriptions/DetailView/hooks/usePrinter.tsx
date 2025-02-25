import React, { useState } from 'react';
import { useLabelPrinterSettings } from '../../api/hooks/useLabelPrinterSettings';
import { Environment } from '@openmsupply-client/config/src';
import {
  useAuthContext,
  useDisabledNotificationPopover,
  useMutation,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { PrescriptionLineFragment, PrescriptionRowFragment } from '../../api';

interface PrintLabel {
  itemDetails: string;
  itemDirections: string;
  patientDetails: string;
  details: string;
}

export const usePrintLabels = () => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const { data: settings } = useLabelPrinterSettings();
  const { store } = useAuthContext();
  const [printerExists, setPrinterExists] = useState(false);

  const { show, DisabledNotification } = useDisabledNotificationPopover({
    title: t('heading.unable-to-print'),
    message: t('error.label-printer-not-configured'),
  });

  const { isLoading, print } = usePrintPrescription();

  //handle the popover with e, or handle the alert modal with state
  const printLabels = (
    prescription: PrescriptionRowFragment,
    lines: PrescriptionLineFragment[],
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (settings === null) {
      e ? show(e) : setPrinterExists(true);
    } else {
      return printPrescriptionLabel(prescription, lines);
    }
  };

  const printPrescriptionLabel = async (
    prescription: PrescriptionRowFragment,
    lines: PrescriptionLineFragment[]
  ) => {
    const labels = lines.map(line => ({
      itemDetails: `${line.numberOfPacks * line.packSize} ${line.item.unitName}: ${line.itemName}`,
      itemDirections: line.note ?? '',
      patientDetails: `${prescription.patient?.name} - ${prescription.patient?.code}`,
      details: `${store?.name} - ${new Date(prescription.createdDatetime).toLocaleDateString()} - ${prescription.clinician?.lastName}, ${prescription.clinician?.firstName}`,
    }));

    return print(labels)
      .then(() => success(t('messages.success-printing-label')))
      .catch(e =>
        error(`${t('error.printing-label')}: ${(e as Error)?.message}`)()
      );
  };
  return {
    isPrintingLabels: isLoading,
    printLabels,
    DisabledNotification,
    printerExists,
    setPrinterExists,
  };
};

const usePrintPrescription = () => {
  const { isLoading, mutateAsync } = useMutation({
    mutationFn: async (labels: PrintLabel[]) => {
      const res = await fetch(Environment.PRINT_LABEL_PRESCRIPTION, {
        method: 'POST',
        body: JSON.stringify(labels),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      return res;
    },
  });

  return { isLoading, print: mutateAsync };
};
