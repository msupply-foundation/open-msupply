import React from 'react';
import { useLabelPrinterSettings } from '../../api/hooks/useLabelPrinterSettings';
import { Environment } from 'packages/config/src';
import {
  useDisabledNotificationPopover,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { PrescriptionLineFragment, PrescriptionRowFragment } from '../../api';

export const usePrintLabels = () => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const { data: settings } = useLabelPrinterSettings();
  const [isPrintingLabels, setIsPrintingLabels] = React.useState(false);

  const { show, DisabledNotification } = useDisabledNotificationPopover({
    title: t('heading.unable-to-print'),
    message: t('error.label-printer-not-configured'),
  });

  const printLabels = (
    e: React.MouseEvent<HTMLButtonElement>,
    prescription: PrescriptionRowFragment,
    lines: PrescriptionLineFragment[]
  ) => {
    if (settings === null) {
      show(e);
    } else {
      printPrescriptionLabel(prescription, lines);
    }
  };

  const printPrescriptionLabel = (
    prescription: PrescriptionRowFragment,
    lines: PrescriptionLineFragment[]
  ) => {
    setIsPrintingLabels(true);
    const labels = lines.map(line => ({
      itemDetails: `${line.numberOfPacks * line.packSize} ${line.item.unitName}: ${line.itemName}`,
      itemDirections: line.note,
      patientDetails: `${prescription.patient?.name} - ${prescription.patient?.code}`,
      details: `${new Date(prescription.createdDatetime).toLocaleDateString()} - ${prescription.clinician?.lastName}, ${prescription.clinician?.firstName}`, // TODO: add store
    }));
    fetch(Environment.PRINT_LABEL_PRESCRIPTION, {
      method: 'POST',
      body: JSON.stringify(labels),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async response => {
        if (response.status !== 200) {
          const text = await response.text();
          throw new Error(text);
        }
        success(t('messages.success-printing-label'))();
      })
      .catch(e => {
        error(`${t('error.printing-label')}: ${e.message}`)();
      })
      .finally(() => setIsPrintingLabels(false));
  };
  return {
    isPrintingLabels,
    printLabels,
    DisabledNotification,
  };
};
