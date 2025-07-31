import React, { ReactElement, SyntheticEvent } from 'react';
import { useCampaigns } from '@openmsupply-client/system/src/Manage/Campaigns/api';
import { Autocomplete, AutocompleteOption } from '@common/components';
import { CampaignNode } from '@common/types';
import { useTranslation } from '@common/intl';
import { ProgramFragment, useProgramList } from '@openmsupply-client/programs';

enum OptionType {
  Campaign = 'campaign',
  Program = 'program',
}

interface CampaignOrProgramOption {
  label: string;
  value: string | null;
  type: OptionType;
}

interface CampaignOrProgramSelectorProps {
  campaignId?: string;
  programId?: string;
  itemId: string;
  onChange: (value: {
    campaign: CampaignNode | null;
    program: ProgramFragment | null;
  }) => void;
}

export const CampaignOrProgramSelector = ({
  campaignId,
  programId,
  itemId,
  onChange,
}: CampaignOrProgramSelectorProps): ReactElement => {
  const t = useTranslation();
  const {
    query: { data: campaignData },
  } = useCampaigns({
    sortBy: { key: 'name', direction: 'asc' },
  });
  const { data: programData } = useProgramList({
    itemId,
  });

  const campaigns = campaignData?.nodes ?? [];
  const programs = programData?.nodes ?? [];

  const options: AutocompleteOption<CampaignOrProgramOption>[] = campaigns
    .map(({ id, name }) => ({
      label: name,
      value: id,
      type: OptionType.Campaign,
    }))
    .concat(
      programs.map(({ id, name }) => ({
        label: name,
        value: id,
        type: OptionType.Program,
      }))
    );

  const selectedOption = options.find(
    ({ value }) => value === campaignId || value === programId
  );

  const handleChange = (
    _: SyntheticEvent,
    option: CampaignOrProgramOption | null
  ) => {
    if (option === null || option?.value === null) {
      onChange({
        campaign: null,
        program: null,
      });
      return;
    }

    switch (option.type) {
      case OptionType.Campaign:
        onChange({
          campaign:
            campaignData?.nodes.find(({ id }) => id === option.value) ?? null,
          program: null,
        });
        return;

      case OptionType.Program:
        onChange({
          campaign: null,
          program:
            programData?.nodes.find(({ id }) => id === option.value) ?? null,
        });
    }
  };

  return (
    <Autocomplete
      clearable
      options={options}
      getOptionLabel={option => option.label}
      value={selectedOption ?? null}
      onChange={handleChange}
      noOptionsText={t('messages.no-campaigns')}
      isOptionEqualToValue={(option, value) => option.value === value?.value}
      width={'160px'}
    />
  );
};
