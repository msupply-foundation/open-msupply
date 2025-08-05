import React from 'react';
import { CellProps, ColumnDescription } from '@openmsupply-client/common';
import { CampaignOrProgramSelector } from './CampaignOrProgramSelector';
import { DraftInboundLine } from '@openmsupply-client/invoices/src/types';

export const getCampaignOrProgramColumn = <T extends DraftInboundLine>(
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

const CampaignCell = <T extends DraftInboundLine>({
  rowData,
  column,
}: CellProps<T>): JSX.Element => (
  <CampaignOrProgramSelector
    campaignId={rowData.campaign?.id ?? undefined}
    programId={rowData.program?.id ?? undefined}
    itemId={rowData.item.id}
    onChange={({ campaign, program }) =>
      column.setter({
        ...rowData,
        campaign: campaign ?? null,
        program: program ?? null,
      })
    }
  />
);
