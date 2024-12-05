import React from 'react';
import { useTranslation } from '@common/intl';
import { ItemRowFragment } from '@openmsupply-client/system';
import {
  BarIcon,
  Box,
  InputWithLabelRow,
  NumericTextInput,
  NumUtils,
  Popover,
  TextArea,
  useToggle,
} from '@openmsupply-client/common';
import { DraftRequestLine } from './hooks';
import { Footer } from './Footer';
import { RequestStats } from './ItemCharts/RequestStats';

const INPUT_WIDTH = 100;
const LABEL_WIDTH = '150px';

interface RequestLineEditProps {
  item?: ItemRowFragment | null;
  draft?: DraftRequestLine | null;
  update: (patch: Partial<DraftRequestLine>) => void;
  save?: () => void;
  hasNext: boolean;
  next: ItemRowFragment | null;
  hasPrevious: boolean;
  previous: ItemRowFragment | null;
}

export const RequestLineEdit = ({
  draft,
  update,
  save,
  hasNext,
  next,
  hasPrevious,
  previous,
}: RequestLineEditProps) => {
  const t = useTranslation();
  const { isOn, toggle } = useToggle();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between">
        <Box paddingLeft={4} paddingRight={7}>
          {/* Left column content */}
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.itemStats.availableStockOnHand}
                disabled
                autoFocus
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.stock-on-hand')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={NumUtils.round(
                  draft?.itemStats.averageMonthlyConsumption ?? 0,
                  2
                )}
                decimalLimit={2}
                disabled
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.amc')}
            sx={{ marginBottom: 1 }}
          />
        </Box>
        <Box>
          {/* Right column content */}
          <Box display="flex" flexDirection="row">
            <InputWithLabelRow
              Input={
                <NumericTextInput
                  width={INPUT_WIDTH}
                  value={draft?.requestedQuantity}
                  onChange={value => {
                    update({ requestedQuantity: value });
                  }}
                  onBlur={save}
                />
              }
              labelWidth={LABEL_WIDTH}
              label={t('label.requested-quantity')}
              sx={{ marginBottom: 1 }}
            />
            <Box
              paddingLeft={1}
              paddingTop={0.5}
              onClick={e => {
                toggle();
                setAnchorEl(e?.currentTarget);
              }}
              sx={{ cursor: 'pointer' }}
            >
              <BarIcon
                sx={{
                  color: 'primary.main',
                  backgroundColor: 'background.drawer',
                  borderRadius: '30%',
                  padding: '2px',
                }}
              />
              {isOn && (
                <Popover
                  anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
                  anchorEl={anchorEl}
                  open={isOn}
                >
                  <RequestStats draft={draft} />
                </Popover>
              )}
            </Box>
          </Box>
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.suggestedQuantity}
                disabled
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.suggested-quantity')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <TextArea
                value={draft?.comment ?? ''}
                onChange={e => update({ comment: e.target.value })}
                InputProps={{
                  sx: {
                    backgroundColor: theme => theme.palette.background.menu,
                  },
                }}
                onBlur={save}
              />
            }
            sx={{ width: 275 }}
            labelWidth={'75px'}
            label={t('label.comment')}
          />
        </Box>
      </Box>
      <Box>
        <Footer
          hasNext={hasNext}
          next={next}
          hasPrevious={hasPrevious}
          previous={previous}
          requisitionNumber={draft?.requisitionNumber}
        />
      </Box>
    </Box>
  );
};
