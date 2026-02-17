import React from 'react';
import {
  CustomCardProps,
  useTranslation,
  useIntlUtils,
  Box,
  Accordion,
  AccordionSummary,
  Typography,
  AccordionDetails,
  Paper,
  Grid,
  InfoIcon,
  TruckIcon,
  InvoiceIcon,
  ChevronDownIcon,
  useIsExtraSmallScreen,
} from '@openmsupply-client/common';
import { MRT_TableBodyCellValue } from 'material-react-table';
import { DraftInboundLine } from '../../../../types';

export const useAccordionCard = () => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const isSmallScreen = useIsExtraSmallScreen();

  return ({ table, row }: CustomCardProps<DraftInboundLine>) => {
    const cells = row.getVisibleCells();
    const line = row.original;
    const unit = line.item.unitName ?? t('label.unit');
    const pluralisedUnitName = getPlural(unit, 2);

    const getCell = (id: string) => cells.find(c => c.column.id === id);
    const getLabelCell = (id: string) => {
      const cell = getCell(id);
      return cell ? (
        <Box sx={{ flex: isSmallScreen ? 1 : 0.5, minWidth: 150 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            {cell.column.columnDef.header as string}
          </Typography>
          <MRT_TableBodyCellValue table={table} cell={cell} />
        </Box>
      ) : null;
    };

    return (
      <Accordion key={line.id} defaultExpanded={row.index === 0}>
        <AccordionSummary expandIcon={<ChevronDownIcon />}>
          <MRT_TableBodyCellValue table={table} cell={getCell('delete')!} />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              flexDirection: isSmallScreen ? 'column' : 'row',
            }}
          >
            <Typography variant="h6">
              {`${t('label.batch')}: ${line.batch}`}
            </Typography>
            <Typography variant="h6">
              {t('label.units-received', { unit: pluralisedUnitName })}:{' '}
              {line.numberOfPacks * line.packSize}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Paper
            elevation={1}
            sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                flexDirection: isSmallScreen ? 'column' : 'row',
              }}
            >
              <Box
                sx={{
                  minWidth: isSmallScreen ? 'auto' : '150px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <InfoIcon color="action" fontSize="small" />
                <Typography variant="body2" color="textSecondary">
                  {t('label.quantities')}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Grid container spacing={2}>
                  {getLabelCell('batch')}
                  {getLabelCell('expiryDate')}
                  {getLabelCell('itemVariant')}
                  {getLabelCell('itemDoses')}
                  {getLabelCell('vvmStatus')}
                  {getLabelCell('shippedPackSize')}
                  {getLabelCell('shippedNumberOfPacks')}
                  {getLabelCell('packSize')}
                  {getLabelCell('numberOfPacks')}
                  {getLabelCell('unitsPerPack')}
                  {getLabelCell('volumePerPack')}
                </Grid>
              </Box>
            </Box>
          </Paper>
          <Paper
            elevation={1}
            sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                flexDirection: isSmallScreen ? 'column' : 'row',
              }}
            >
              <Box
                sx={{
                  minWidth: isSmallScreen ? 'auto' : '150px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <TruckIcon color="action" fontSize="small" />
                <Typography variant="body2" color="textSecondary">
                  {t('label.pricing')}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Grid container spacing={2}>
                  {getLabelCell('costPricePerPack')}
                  {getLabelCell('foreignCurrencyCostPricePerPack')}
                  {getLabelCell('sellPricePerPack')}
                  {getLabelCell('foreignCurrencySellPricePerPack')}
                  {getLabelCell('lineTotal')}
                  {getLabelCell('foreignCurrencyLineTotal')}
                </Grid>
              </Box>
            </Box>
          </Paper>
          <Paper
            elevation={1}
            sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                flexDirection: isSmallScreen ? 'column' : 'row',
              }}
            >
              <Box
                sx={{
                  minWidth: isSmallScreen ? 'auto' : '150px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <InvoiceIcon color="action" fontSize="small" />
                <Typography variant="body2" color="textSecondary">
                  {t('heading.other')}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Grid container spacing={2}>
                  {getLabelCell('location')}
                  {getLabelCell('note')}
                  {getLabelCell('donor')}
                  {getLabelCell('campaignOrProgram')}
                </Grid>
              </Box>
            </Box>
          </Paper>
        </AccordionDetails>
      </Accordion>
    );
  };
};
