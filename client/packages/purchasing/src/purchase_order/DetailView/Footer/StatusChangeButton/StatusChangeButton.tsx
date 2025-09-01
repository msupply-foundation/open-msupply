import React, { ReactElement } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  SplitButton,
  useDisabledNotificationToast,
} from '@openmsupply-client/common';
import { useStatusChangeButton } from './useStatusChangeButton';
import { hasValidPurchaseOrderLines } from '../utils';

export const StatusChangeButton = (): ReactElement | null => {
  const t = useTranslation();
  const { lines, options, selectedOption, setSelectedOption, getConfirmation } =
    useStatusChangeButton();

  const noLinesNotification = useDisabledNotificationToast(
    t('messages.no-lines')
  );

  if (!selectedOption) return null;

  const handleClick = () => {
    if (!hasValidPurchaseOrderLines(lines)) return noLinesNotification();
    return getConfirmation();
  };

  return (
    <SplitButton
      options={options}
      selectedOption={selectedOption}
      onSelectOption={setSelectedOption}
      Icon={<ArrowRightIcon />}
      onClick={handleClick}
    />
  );
};
