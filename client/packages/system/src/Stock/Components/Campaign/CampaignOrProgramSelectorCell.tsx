import React from 'react';
import { ProgramFragment } from '@openmsupply-client/programs';
import { CampaignOrProgramSelector } from './CampaignOrProgramSelector';
import { CampaignRowFragment } from '../../../Manage/Campaigns/api';

interface CampaignRowData {
  id: string;
  campaign?: { id: string } | null;
  program?: { id: string } | null;
  item: { id: string };
}

export const CampaignOrProgramCell = <T extends CampaignRowData>({
  row,
  updateFn,
  disabled,
}: {
  row: T;
  updateFn: (patch: {
    campaign: CampaignRowFragment | null;
    program: ProgramFragment | null;
  }) => void;
  disabled?: boolean;
}): JSX.Element => (
  <CampaignOrProgramSelector
    campaignId={row.campaign?.id ?? undefined}
    programId={row.program?.id ?? undefined}
    programOptionsOrFilter={{ filterByItemId: row.item.id }}
    onChange={({ campaign, program }) =>
      updateFn({
        campaign: campaign ?? null,
        program: program ?? null,
      })
    }
    fullWidth
    disabled={disabled}
  />
);
