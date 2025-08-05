import React from 'react';
import {
  CampaignNode,
  CellProps,
  ColumnDescription,
  RecordWithId,
} from '@openmsupply-client/common';
import { CampaignSelector } from './CampaignSelector';

export const getCampaignColumn = <T extends RecordWithId>(
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

const CampaignCell = <T extends RecordWithId>({
  rowData,
  column,
}: CellProps<T>): JSX.Element => {
  const selected = column.accessor({ rowData }) as CampaignNode | null;

  const onChange = (campaign?: CampaignNode | null) => {
    column.setter({ ...rowData, campaign });
  };

  return (
    <CampaignSelector selected={selected ?? undefined} onChange={onChange} />
  );
};
