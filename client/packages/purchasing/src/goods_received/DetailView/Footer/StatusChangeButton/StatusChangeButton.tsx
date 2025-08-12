import React, { ReactElement } from 'react';
import { ArrowRightIcon, SplitButton } from '@openmsupply-client/common';
import { useStatusChangeButton } from './useStatusChangeButton';

export const StatusChangeButton = (): ReactElement | null => {
  const { options, selectedOption, setSelectedOption, getConfirmation } =
    useStatusChangeButton();

  if (!selectedOption) return null;

  const handleClick = () => {
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
