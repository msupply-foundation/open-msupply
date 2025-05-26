import React, { ReactElement, SyntheticEvent } from 'react';
import { useCampaigns } from '@openmsupply-client/system/src/Manage/Campaigns/api';
import { Autocomplete, AutocompleteOption } from '@common/components';
import { CampaignNode } from '@common/types';
import { useTranslation } from '@common/intl';

interface CampaignOption {
  label: string;
  value: string | null;
}

interface CampaignSelectorProps {
  campaignId?: string;
  onChange: (value: CampaignNode | null) => void;
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

  const campaigns = data?.nodes ?? [];
  const options: AutocompleteOption<CampaignOption>[] = campaigns.map(
    ({ id, name }) => ({
      label: name,
      value: id,
    })
  );

  const selectedCampaign = campaigns.find(({ id }) => id === campaignId);

  if (
    campaigns.length > 0 &&
    selectedCampaign != null &&
    selectedCampaign !== undefined
  ) {
    options.push({ label: t('label.remove'), value: null });
  }

  const handleChange = (_: SyntheticEvent, option: CampaignOption | null) => {
    if (option === null || option?.value === null) {
      onChange(null);
      return;
    }
    const selectedOption = data?.nodes.find(({ id }) => id === option?.value);
    if (selectedOption) onChange(selectedOption);
  };

  return (
    <Autocomplete
      clearable={false}
      options={options}
      getOptionLabel={option => option.label}
      value={{
        label: selectedCampaign?.name ?? '',
        value: selectedCampaign?.id ?? '',
      }}
      onChange={handleChange}
      noOptionsText={t('messages.no-campaigns')}
      isOptionEqualToValue={(option, value) => option.value === value?.value}
      width={'160px'}
    />
  );
};
