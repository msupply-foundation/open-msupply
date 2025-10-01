import React from 'react';
import {
  CampaignNode,
  CellProps,
  ColumnDescription,
} from '@openmsupply-client/common';
import { ProgramFragment } from '@openmsupply-client/programs';
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

export const CampaignOrProgramCell = <T extends CampaignRowData>({
  row,
  updateFn,
}: {
  row: T;
  updateFn: (patch: {
    campaign: CampaignNode | null;
    program: ProgramFragment | null;
  }) => void;
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
  />
);
