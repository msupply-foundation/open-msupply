import React, { useState } from 'react';
import { SplitButton, SplitButtonOption } from '@common/components';
import { LocaleKey, TypedTFunction, useTranslation } from '@common/intl';
import { EncounterNodeStatus } from '@common/types';
import { encounterStatusTranslation } from '../utils';
import { ArrowRightIcon } from '@common/icons';

export const StatusChangeButton = ({
  currentStatus,
  onSave,
}: {
  currentStatus: EncounterNodeStatus;
  onSave: (status: EncounterNodeStatus) => void;
}) => {
  const t = useTranslation();

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<EncounterNodeStatus>
  >(encounterStatusOption(EncounterNodeStatus.Visited, t, currentStatus));

  const onStatusClick = () => {
    if (!selectedOption.value || selectedOption.value === currentStatus) return;
    onSave(selectedOption.value);
    setSelectedOption(selected => ({ ...selected, isDisabled: true }));
  };

  const statusOptions = [
    encounterStatusOption(EncounterNodeStatus.Pending, t, currentStatus),
    encounterStatusOption(EncounterNodeStatus.Visited, t, currentStatus),
    encounterStatusOption(EncounterNodeStatus.Cancelled, t, currentStatus),
  ];

  return (
    <SplitButton
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
  t: TypedTFunction<LocaleKey>,
  currentStatus?: EncounterNodeStatus
): SplitButtonOption<EncounterNodeStatus> {
  return {
    label: t('label.mark-as-status', {
      status: encounterStatusTranslation(status, t),
    }),
    value: status,
    isDisabled: status === currentStatus,
  };
}
