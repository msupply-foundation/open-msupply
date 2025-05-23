import React, { ReactElement } from 'react';
import { useCampaigns } from '@openmsupply-client/system/src/Manage/Campaigns/api';
import { Autocomplete } from '@common/components';
import { CampaignNode } from '@common/types';
import { useTranslation } from '@common/intl';

interface CampaignSelectorProps {
  campaignId?: string;
  onChange: (value: CampaignNode) => void;
}

export const CampaignSelector = ({
  campaignId,
  onChange,
}: CampaignSelectorProps): ReactElement => {
  const t = useTranslation();
  const {
    query: { data },
  } = useCampaigns({
    sortBy: { key: 'name', direction: 'asc' },
  });

  const options =
    data?.nodes.map(({ id, name }) => ({
      label: name,
      value: id,
    })) ?? [];

  const selectedCampaign = data?.nodes.find(({ id }) => id === campaignId);

  return (
    <Autocomplete
      clearable={false}
      options={options}
      getOptionLabel={option => option.label}
      value={{
        label: selectedCampaign?.name ?? '',
        value: selectedCampaign?.id ?? '',
      }}
      onChange={(_, option) => {
        const selectedOption = data?.nodes.find(
          ({ id }) => id === option?.value
        );
        if (selectedOption) onChange(selectedOption);
      }}
      noOptionsText={t('messages.no-campaigns')}
      isOptionEqualToValue={(option, value) => option.value === value?.value}
      width={'160px'}
    />
  );
};
