import React from 'react';
import { CellProps, ColumnDescription } from '@openmsupply-client/common';
import { CampaignSelector } from './CampaignSelector';
import { DraftInboundLine } from '@openmsupply-client/invoices/src/types';

export const getCampaignColumn = <T extends DraftInboundLine>(
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
  <CampaignSelector
    campaignId={rowData.campaign?.id ?? undefined}
    onChange={campaign =>
      column.setter({ ...rowData, campaign: campaign ?? null })
    }
  />
);
