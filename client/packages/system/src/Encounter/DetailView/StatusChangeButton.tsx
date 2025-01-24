import React, { useState } from 'react';
import { SplitButton, SplitButtonOption } from '@common/components';
import { LocaleKey, TypedTFunction, useTranslation } from '@common/intl';
import { EncounterNodeStatus } from '@common/types';
import { encounterStatusTranslation } from '../utils';
import { ArrowRightIcon } from '@common/icons';

export const StatusChangeButton = () => {
  const t = useTranslation();

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<EncounterNodeStatus>
  >(encounterStatusOption(EncounterNodeStatus.Visited, t));

  const onStatusClick = () => {
    // return getConfirmation();
  };

  const statusOptions = [
    encounterStatusOption(EncounterNodeStatus.Pending, t),
    encounterStatusOption(EncounterNodeStatus.Visited, t),
    encounterStatusOption(EncounterNodeStatus.Cancelled, t),
  ];

  return (
    <SplitButton
      // deleted?
      // label={noLines ? t('messages.no-lines') : ''}
      options={statusOptions}
      selectedOption={selectedOption}
      onSelectOption={setSelectedOption}
      Icon={<ArrowRightIcon />}
      onClick={onStatusClick}
    />
  );
};

function encounterStatusOption(
  status: EncounterNodeStatus,
  t: TypedTFunction<LocaleKey>
): SplitButtonOption<EncounterNodeStatus> {
  return {
    label: encounterStatusTranslation(status, t),
    value: status,
  };
}
