import React from 'react';
import {
  Grid,
  InputWithLabelRow,
  NumericTextInput,
  TextArea,
  Typography,
} from '@openmsupply-client/common';
import { ItemRowFragment, ItemSearchInput } from '@openmsupply-client/system';
import { useRequestRequisitionLines } from '../../api';
import { DraftRequestRequisitionLine } from './RequestLineEdit';

interface RequestLineEditFormProps {
  item: ItemRowFragment | null;
  disabled: boolean;
  onChangeItem: (item: ItemRowFragment) => void;
  update: (patch: Partial<DraftRequestRequisitionLine>) => void;
  draftLine: DraftRequestRequisitionLine | null;
}

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <Grid spacing={2} container direction="row">
      <Grid xs={2} item>
        <Typography variant="body1" fontWeight={700}>
          {label}
        </Typography>
      </Grid>
      <Grid xs={2} item>
        <Typography variant="body1">{value}</Typography>
      </Grid>
    </Grid>
  );
};

export const RequestLineEditForm = ({
  item,
  disabled,
  onChangeItem,
  update,
}: RequestLineEditFormProps) => {
  const { lines } = useRequestRequisitionLines();
  return (
    <Grid container spacing={2} direction="row" justifyContent="space-between">
      <Grid item xs={4}>
        <Typography variant="body1" fontWeight="bold">
          Stock details
        </Typography>
        <ItemSearchInput
          width={300}
          disabled={disabled}
          currentItem={item}
          onChange={(newItem: ItemRowFragment | null) =>
            newItem && onChangeItem(newItem)
          }
          extraFilter={item => {
            const itemAlreadyInShipment = lines?.some(
              ({ id }) => id === item.id
            );
            return !itemAlreadyInShipment;
          }}
        />
        {item?.code ? <InfoRow label="Code" value={item?.code} /> : null}
        {item?.unitName ? <InfoRow label="Unit" value={item.unitName} /> : null}
      </Grid>
      <Grid item xs={4}>
        <Typography variant="body1" fontWeight="bold">
          Comments
        </Typography>
        <TextArea
          InputProps={{
            sx: { backgroundColor: theme => theme.palette.background.menu },
          }}
        />
      </Grid>
      <Grid item xs={4}>
        <Typography variant="body1" fontWeight="bold">
          Order
        </Typography>
        <InputWithLabelRow
          Input={
            <NumericTextInput
              width={220}
              onChange={e =>
                update({ requestedQuantity: Number(e.target.value) })
              }
            />
          }
          labelProps={{ sx: { fontWeight: 500 } }}
          label="Order Quantity"
        />
      </Grid>
    </Grid>
  );
};
