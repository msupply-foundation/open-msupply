import React, { useEffect, useState } from 'react';
import {
  Grid,
  BasicTextInput,
  ModalLabel,
  ModalRow,
  Select,
  useTranslation,
  InputLabel,
  NonNegativeIntegerInput,
  Divider,
  Box,
  Typography,
  ButtonWithIcon,
  ZapIcon,
} from '@openmsupply-client/common';
import {
  StockItemSearchInput,
  ItemRowFragment,
} from '@openmsupply-client/system';
import { usePrescription } from '../../api';
import { DraftItem } from '../../..';
import { PackSizeController } from '../../../StockOut';
import { DraftStockOutLine } from 'packages/invoices/src/types';

interface PrescriptionLineEditFormProps {
  allocatedQuantity: number;
  availableQuantity: number;
  item: DraftItem | null;
  onChangeItem: (newItem: ItemRowFragment | null) => void;
  onChangeQuantity: (
    quantity: number,
    packSize: number | null,
    isAutoAllocated: boolean
  ) => void;
  packSizeController: PackSizeController;
  disabled: boolean;
  canAutoAllocate: boolean;
  isAutoAllocated: boolean;
  updateNotes: (note: string) => void;
  draftPrescriptionLines: DraftStockOutLine[];
}

export const PrescriptionLineEditForm: React.FC<
  PrescriptionLineEditFormProps
> = ({
  allocatedQuantity,
  onChangeItem,
  onChangeQuantity,
  item,
  packSizeController,
  availableQuantity,
  disabled,
  canAutoAllocate,
  updateNotes,
  draftPrescriptionLines,
}) => {
  const t = useTranslation('dispensary');

  const quantity =
    allocatedQuantity /
    Math.abs(Number(packSizeController.selected?.value || 1));

  const [issueQuantity, setIssueQuantity] = useState(0);
  const { items } = usePrescription.line.rows();

  const onChangePackSize = (newPackSize: number) => {
    const newAllocatedQuantity =
      newPackSize === 0 ? 0 : Math.round(allocatedQuantity / newPackSize);
    packSizeController.setPackSize(newPackSize);
    onChangeQuantity(
      newAllocatedQuantity,
      newPackSize === -1 ? null : newPackSize,
      false
    );
  };

  const unit = item?.unitName ?? t('label.unit');
  const allocate = () => {
    onChangeQuantity(
      issueQuantity,
      packSizeController.selected?.value === -1
        ? null
        : Number(packSizeController.selected?.value),
      true
    );
  };

  const handleIssueQuantityChange = (quantity: number) => {
    setIssueQuantity(quantity);
  };

  const prescriptionLineWithNote = draftPrescriptionLines.find(l => !!l.note);
  const note = prescriptionLineWithNote?.note ?? '';

  useEffect(() => {
    setIssueQuantity(quantity);
  }, [packSizeController.selected?.value]);

  return (
    <Grid container gap="4px">
      <ModalRow>
        <ModalLabel label={t('label.item', { count: 1 })} />
        <Grid item flex={1}>
          <StockItemSearchInput
            autoFocus={!item}
            openOnFocus={!item}
            disabled={disabled}
            currentItemId={item?.id}
            onChange={onChangeItem}
            extraFilter={
              disabled
                ? undefined
                : item => !items?.some(({ id }) => id === item.id)
            }
          />
        </Grid>
      </ModalRow>
      {item && (
        <>
          <ModalRow>
            <ModalLabel label="" />
            <Grid item display="flex">
              <Typography
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                {t('label.available-quantity', {
                  number: availableQuantity.toFixed(0),
                })}
              </Typography>
            </Grid>

            <Grid
              style={{ display: 'flex' }}
              justifyContent="flex-end"
              flex={1}
            >
              <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
              <BasicTextInput
                disabled
                sx={{ width: 150 }}
                value={item?.unitName ?? ''}
              />
            </Grid>
          </ModalRow>
          <ModalRow>
            <ModalLabel label={t('label.note')} />
            <BasicTextInput
              value={note}
              onChange={e => {
                updateNotes(e.target.value);
              }}
              InputProps={{
                sx: {
                  backgroundColor: theme => theme.palette.background.menu,
                },
              }}
              fullWidth
              style={{ flex: 1 }}
            />
          </ModalRow>
        </>
      )}
      {item && canAutoAllocate ? (
        <>
          <Divider margin={10} />
          <Grid container>
            <ModalLabel label={t('label.issue')} />
            <NonNegativeIntegerInput
              autoFocus
              value={issueQuantity}
              onChange={handleIssueQuantityChange}
            />

            <Box marginLeft={1} />

            {packSizeController.options.length ? (
              <>
                <Grid
                  item
                  alignItems="center"
                  display="flex"
                  justifyContent="flex-start"
                  style={{ minWidth: 125 }}
                >
                  <InputLabel sx={{ fontSize: '12px' }}>
                    {packSizeController.selected?.value === -1
                      ? `${t('label.unit-plural', {
                          unit,
                          count: issueQuantity,
                        })} ${t('label.in-packs-of')}`
                      : t('label.in-packs-of')}
                  </InputLabel>
                </Grid>

                <Box marginLeft={1} />

                <Select
                  sx={{ width: 110 }}
                  options={packSizeController.options}
                  value={packSizeController.selected?.value ?? ''}
                  onChange={e => {
                    const { value } = e.target;
                    onChangePackSize(Number(value));
                  }}
                />
                {packSizeController.selected?.value !== -1 && (
                  <Grid
                    item
                    alignItems="center"
                    display="flex"
                    justifyContent="flex-start"
                  >
                    <InputLabel style={{ fontSize: 12, marginLeft: 8 }}>
                      {t('label.unit-plural', {
                        count: packSizeController.selected?.value,
                        unit,
                      })}
                    </InputLabel>
                  </Grid>
                )}
                <Box marginLeft="auto" />
              </>
            ) : null}
            <Box flex={1} display="flex" justifyContent="flex-end">
              <ButtonWithIcon
                disabled={issueQuantity === 0}
                onClick={allocate}
                label={t('button.allocate')}
                Icon={<ZapIcon />}
              />
            </Box>
          </Grid>
        </>
      ) : (
        <Box height={100} />
      )}
    </Grid>
  );
};
