import React from 'react';
import { Box, IconButton } from '@mui/material';
import { InfoIcon } from '@common/icons';
import { DraftStockOutLineFragment } from 'packages/invoices/src/StockOut';
import { VariantPopoverDetails } from './VariantPopoverDetails';
import { PaperPopoverSection, usePaperClickPopover } from '@common/components';
import { useTranslation } from 'packages/common/src';

interface BatchWithVariantCellProps {
  rowData: DraftStockOutLineFragment;
}

export const BatchWithVariantCell = ({
  rowData,
}: BatchWithVariantCellProps) => {
  const { show, PaperClickPopover } = usePaperClickPopover();
  const t = useTranslation();

  return (
    <>
      {rowData.batch}
      {rowData.itemVariant && (
        <>
          <IconButton size="small" onClick={show} style={{ marginLeft: 4 }}>
            <InfoIcon fontSize="inherit" />
          </IconButton>
          <PaperClickPopover
            placement="bottom"
            width={600}
            Content={
              <PaperPopoverSection label={t('label.item-variant')}>
                <Box
                  style={{
                    overflowY: 'auto',
                    maxHeight: 300,
                  }}
                >
                  <VariantPopoverDetails variant={rowData.itemVariant} />
                </Box>
              </PaperPopoverSection>
            }
          ></PaperClickPopover>
        </>
      )}
    </>
  );
};
