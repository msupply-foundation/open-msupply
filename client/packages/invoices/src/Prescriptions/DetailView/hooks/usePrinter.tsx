import React, { useState } from 'react';
import { useLabelPrinterSettings } from '../../api/hooks/useLabelPrinterSettings';
import { Environment } from '@openmsupply-client/config/src';
import { useAuthContext, usePrinter } from '@openmsupply-client/common';
import { PrescriptionLineFragment, PrescriptionRowFragment } from '../../api';
import { groupItems, generateLabel } from './utils';

export const usePrintLabels = () => {
  const { data: settings } = useLabelPrinterSettings();
  const { store } = useAuthContext();
  const [printerExists, setPrinterExists] = useState(false);

  const {
    isPrinting: isPrintingLabels,
    print,
    DisabledNotification,
  } = usePrinter(settings);

  const printLabels = (
    prescription: PrescriptionRowFragment,
    lines: PrescriptionLineFragment[],
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (settings === null) {
      e ? undefined : setPrinterExists(true);
      return;
    }

    const storeName = store?.name ?? '';
    const items = groupItems(lines);
    const labels = generateLabel(items, prescription, storeName);

    print(
      {
        endpoint: Environment.PRINT_LABEL_PRESCRIPTION,
        payload: labels,
      },
      e
    );
  };

  return {
    isPrintingLabels,
    printLabels,
    DisabledNotification,
    printerExists,
    setPrinterExists,
  };
};
