import React, { useState } from 'react';
import { useLabelPrinterSettings } from '../../api/hooks/useLabelPrinterSettings';
import { Environment } from '@openmsupply-client/config/src';
import {
  useAuthContext,
  usePreferences,
  usePrinter,
} from '@openmsupply-client/common';
import { PrescriptionLineFragment, PrescriptionFragment } from '../../api';
import { groupItems, generateLabel } from './utils';

export const usePrintLabels = () => {
  const { data: settings } = useLabelPrinterSettings();
  const { store } = useAuthContext();
  const { doNotPrintPlaceholderLineLabels } = usePreferences();
  const [printerExists, setPrinterExists] = useState(false);

  const {
    isPrinting: isPrintingLabels,
    print,
    showDisabledNotification,
    isUsbPrinting,
  } = usePrinter(settings);

  const printLabels = (
    prescription: PrescriptionFragment,
    lines: PrescriptionLineFragment[],
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (settings === null && !isUsbPrinting) {
      e ? showDisabledNotification() : setPrinterExists(true);
      return;
    }

    const storeName = store?.name ?? '';
    const items = groupItems(lines, doNotPrintPlaceholderLineLabels ?? false);
    const labels = generateLabel(items, prescription, storeName);

    print({
      endpoint: Environment.PRINT_LABEL_PRESCRIPTION,
      payload: labels,
    });
  };

  return {
    isPrintingLabels,
    printLabels,
    printerExists,
    setPrinterExists,
  };
};
