import React, { FC, useState } from 'react';
import {
  useTranslation,
  Checkbox,
  Grid,
  Typography,
  DateUtils,
  Formatter,
  TextWithLabelRow,
  InputWithLabelRow,
  BasicTextInput,
  DialogButton,
  useDialog,
  CurrencyInput,
  InputWithLabelRowProps,
  ObjUtils,
  ExpiryDateInput,
} from '@openmsupply-client/common';
import { StockLineRowFragment, useStock } from '../api';

interface StockLineEditModalProps {
  isOpen: boolean;
  onClose: () => void;

  stockLine: StockLineRowFragment | null;
}

interface UseDraftStockLineControl {
  draft: StockLineRowFragment;
  onUpdate: (patch: Partial<StockLineRowFragment>) => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

const useDraftStockLine = (
  seed: StockLineRowFragment
): UseDraftStockLineControl => {
  const [stockLine, setStockLine] = useState<StockLineRowFragment>(() => ({
    ...seed,
  }));
  const { mutate, isLoading } = useStock.document.update();

  const onUpdate = (patch: Partial<StockLineRowFragment>) => {
    setStockLine({ ...stockLine, ...patch });
  };

  const onSave = async () => mutate(stockLine);

  return {
    draft: stockLine,
    onUpdate,
    onSave,
    isLoading,
  };
};

const StyledInputRow = ({ label, Input }: InputWithLabelRowProps) => (
  <InputWithLabelRow
    label={label}
    Input={Input}
    labelProps={{ sx: { textAlign: 'end' } }}
    labelWidth="100px"
    sx={{
      justifyContent: 'space-between',
      '.MuiFormControl-root > .MuiInput-root, > input': {
        maxWidth: '120px',
      },
    }}
  />
);

export const StockLineEditModal: FC<StockLineEditModalProps> = ({
  stockLine,
  isOpen,
  onClose,
}) => {
  const t = useTranslation('inventory');
  const { Modal } = useDialog({ isOpen, onClose });

  if (!stockLine) return null;

  const { draft, onUpdate, onSave } = useDraftStockLine(stockLine);
  return (
    <Modal
      width={600}
      slideAnimation={false}
      title={t('title.stock-line-details')}
      okButton={
        <DialogButton
          variant="ok"
          disabled={ObjUtils.isEqual(draft, stockLine)}
          onClick={async () => {
            await onSave();
            onClose();
          }}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <Grid
        container
        paddingBottom={4}
        paddingTop={4}
        alignItems="center"
        flexDirection="column"
      >
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">
          {stockLine.item.name}
        </Typography>
        <Typography sx={{ fontWeight: 'bold' }}>
          {`${t('label.code')} : ${stockLine.item.code}`}
        </Typography>
        <Grid
          display="flex"
          flex={1}
          container
          paddingTop={2}
          paddingBottom={2}
          width="100%"
        >
          <Grid
            container
            display="flex"
            flex={1}
            flexBasis="50%"
            flexDirection="column"
            gap={1}
          >
            <TextWithLabelRow
              label={t('label.pack-quantity')}
              text={String(stockLine.totalNumberOfPacks)}
              textProps={{ textAlign: 'end' }}
              labelProps={{ sx: { paddingRight: 1 } }}
            />
            <StyledInputRow
              label={t('label.cost-price')}
              Input={
                <CurrencyInput
                  autoFocus
                  value={draft.costPricePerPack}
                  onChangeNumber={costPricePerPack =>
                    onUpdate({ costPricePerPack })
                  }
                />
              }
            />
            <StyledInputRow
              label={t('label.sell-price')}
              Input={
                <CurrencyInput
                  value={draft.sellPricePerPack}
                  onChangeNumber={sellPricePerPack =>
                    onUpdate({ sellPricePerPack })
                  }
                />
              }
            />
            <StyledInputRow
              label={t('label.expiry')}
              Input={
                <ExpiryDateInput
                  value={DateUtils.getDateOrNull(draft.expiryDate)}
                  onChange={date =>
                    onUpdate({ expiryDate: Formatter.naiveDate(date) })
                  }
                />
              }
            />
            <StyledInputRow
              label={t('label.batch')}
              Input={
                <BasicTextInput
                  value={draft.batch ?? ''}
                  onChange={e => onUpdate({ batch: e.target.value })}
                />
              }
            />
          </Grid>
          <Grid
            container
            display="flex"
            flex={1}
            flexBasis="50%"
            flexDirection="column"
            gap={1}
          >
            <TextWithLabelRow
              label={t('label.pack-size')}
              text={String(stockLine.packSize)}
              textProps={{ textAlign: 'end' }}
            />
            <StyledInputRow
              label={t('label.on-hold')}
              Input={
                <Checkbox
                  checked={draft.onHold}
                  onChange={(_, onHold) => onUpdate({ onHold })}
                />
              }
            />
          </Grid>
        </Grid>
      </Grid>
    </Modal>
  );
};
