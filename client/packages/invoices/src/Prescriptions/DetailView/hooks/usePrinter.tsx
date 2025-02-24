import React, { useState } from 'react';
import { useLabelPrinterSettings } from '../../api/hooks/useLabelPrinterSettings';
import { Environment } from '@openmsupply-client/config/src';
import {
  useAuthContext,
  useDisabledNotificationPopover,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { PrescriptionLineFragment, PrescriptionRowFragment } from '../../api';

export const usePrintLabels = () => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const { data: settings } = useLabelPrinterSettings();
  const { store } = useAuthContext();
  const [isPrintingLabels, setIsPrintingLabels] = React.useState(false);
  const [printerExists, setPrinterExists] = useState(false);

  const { show, DisabledNotification } = useDisabledNotificationPopover({
    title: t('heading.unable-to-print'),
    message: t('error.label-printer-not-configured'),
  });

  //handle the popover with e, or handle the alert modal with state
  const printLabels = (
    prescription: PrescriptionRowFragment,
    lines: PrescriptionLineFragment[],
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (settings === null) {
      e ? show(e) : setPrinterExists(true);
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
      itemDirections: line.note ?? '',
      patientDetails: `${prescription.patient?.name} - ${prescription.patient?.code}`,
      details: `${store?.name} - ${new Date(prescription.createdDatetime).toLocaleDateString()} - ${prescription.clinician?.lastName}, ${prescription.clinician?.firstName}`,
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
      });
    setIsPrintingLabels(false);
  };
  return {
    isPrintingLabels,
    printLabels,
    DisabledNotification,
    printerExists,
    setPrinterExists,
  };
};
