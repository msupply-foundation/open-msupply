import React from 'react';
import { CellProps, ColumnDescription } from '@openmsupply-client/common';
import { CampaignOrProgramSelector } from './CampaignOrProgramSelector';

interface CampaignRowData {
  id: string;
  campaign?: { id: string } | null;
  program?: { id: string } | null;
  item: { id: string };
}

export const getCampaignOrProgramColumn = <T extends CampaignRowData>(
  update: (patch: Partial<T> & { id: string }) => void
): ColumnDescription<T> => {
  return {
    key: 'campaign',
    label: 'label.campaign',
    width: 200,
    Cell: CampaignCell,
    setter: patch => update({ ...patch }),
  };
};

const CampaignCell = <T extends CampaignRowData>({
  rowData,
  column,
}: CellProps<T>): JSX.Element => (
  <CampaignOrProgramSelector
    campaignId={rowData.campaign?.id ?? undefined}
    programId={rowData.program?.id ?? undefined}
    programOptionsOrFilter={{ filterByItemId: rowData.item.id }}
    onChange={({ campaign, program }) =>
      column.setter({
        ...rowData,
        campaign: campaign ?? null,
        program: program ?? null,
      })
    }
  />
);
