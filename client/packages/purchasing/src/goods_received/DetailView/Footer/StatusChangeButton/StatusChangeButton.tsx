import React, { ReactElement } from 'react';
import {
  ArrowRightIcon,
  SplitButton,
  // useDisabledNotificationToast,
  // useTranslation,
} from '@openmsupply-client/common';
import { useStatusChangeButton } from './useStatusChangeButton';

export const StatusChangeButton = (): ReactElement | null => {
  // const t = useTranslation();
  const { options, selectedOption, setSelectedOption, getConfirmation } =
    useStatusChangeButton();

  // const noLinesNotification = useDisabledNotificationToast(
  //   t('messages.no-lines')
  // );

  if (!selectedOption) return null;

  const handleClick = () => {
    // TODO: Add validate for empty goods received
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
