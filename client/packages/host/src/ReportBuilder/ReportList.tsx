import React, { useState } from 'react';
import { Box, Typography } from '@openmsupply-client/common';
import { ArrowLeftIcon, ArrowRightIcon } from '@common/icons';

type SavedReportOption = {
  label: string;
  value: string;
  template: string;
  context: string;
  subContext: string | null;
  isCustom: boolean;
};

interface ReportListProps {
  reports: SavedReportOption[];
  isLoading: boolean;
  selectedReportId: string | null;
  isCentralServer: boolean;
  onSelectReport: (report: SavedReportOption) => void;
  onNewReport: () => void;
}

const contextLabel: Record<string, string> = {
  REQUISITION: 'Requisition',
  INBOUND_SHIPMENT: 'Inbound Shipment',
  OUTBOUND_SHIPMENT: 'Outbound Shipment',
  PRESCRIPTION: 'Prescription',
  STOCKTAKE: 'Stocktake',
  PURCHASE_ORDER: 'Purchase Order',
  CUSTOMER_RETURN: 'Customer Return',
  SUPPLIER_RETURN: 'Supplier Return',
  INTERNAL_ORDER: 'Internal Order',
  ASSET: 'Asset',
  PATIENT: 'Patient',
  DISPENSARY: 'Dispensary',
  REPACK: 'Repack',
  OUTBOUND_RETURN: 'Outbound Return',
  INBOUND_RETURN: 'Inbound Return',
  REPORT: 'Report',
  RESOURCE: 'Resource',
};

export const ReportList = ({
  reports,
  isLoading,
  selectedReportId,
  isCentralServer,
  onSelectReport,
  onNewReport,
}: ReportListProps) => {
  const [expanded, setExpanded] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const boxProps = !expanded
    ? { width: '200px', minWidth: '200px' }
    : { flex: 1, minWidth: '640px' };

  // One shared grid — header + all rows — so columns align perfectly.
  // Name: 1fr (takes remaining space, truncates).
  // All others: auto (sizes to widest cell content).
  const gridColumns = expanded ? 'max-content auto auto auto auto' : '1fr';

  const headerCellSx = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'text.secondary',
    px: 1,
    py: 0.75,
    whiteSpace: 'nowrap',
    position: 'sticky' as const,
    top: 0,
    bgcolor: 'background.default',
    borderBottom: '1px solid',
    borderColor: 'divider',
    zIndex: 1,
  };

  const dataCellSx = (report: SavedReportOption) => ({
    fontSize: '0.75rem',
    px: 1,
    py: 1,
    borderBottom: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    alignItems: 'center',
    bgcolor:
      selectedReportId === report.value
        ? 'action.selected'
        : hoveredId === report.value
        ? 'action.hover'
        : 'transparent',
  });

  return (
    <Box
      {...boxProps}
      display="flex"
      flexDirection="column"
      borderRight="1px solid"
      sx={{ borderColor: 'divider', overflow: 'hidden', transition: 'width 0.2s, min-width 0.2s' }}
    >
      {/* Header with toggle arrow */}
      <Box display="flex" alignItems="center" sx={{ flexShrink: 0 }}>
        <Typography variant="h6" padding={2} paddingBottom={1} sx={{ flex: 1 }}>
          Reports
        </Typography>
        <Box
          onClick={() => setExpanded(e => !e)}
          title={expanded ? 'Collapse columns' : 'Expand columns'}
          sx={{
            pr: 1.5,
            pb: 0.5,
            cursor: 'pointer',
            color: 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            '&:hover': { color: 'primary.main' },
          }}
        >
          {expanded ? <ArrowLeftIcon fontSize="small" /> : <ArrowRightIcon fontSize="small" />}
        </Box>
      </Box>

      {/* Pinned: new report button */}
      <Box
        onClick={onNewReport}
        sx={{
          px: 2,
          py: 1.25,
          cursor: 'pointer',
          borderBottom: '1px solid',
          borderTop: '1px solid',
          borderColor: 'divider',
          color: 'primary.main',
          fontWeight: 600,
          fontSize: '0.875rem',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        + New Report
      </Box>

      {/* Scrollable area — grid spans header + all data rows */}
      <Box flex={1} sx={{ overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <Box px={2} py={1.5}>
            <Typography variant="body2" color="textSecondary">Loading...</Typography>
          </Box>
        ) : reports.length === 0 ? (
          <Box px={2} py={1.5}>
            <Typography variant="body2" color="textSecondary">No saved reports</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: gridColumns }}>

            {/* ── Header row ── */}
            <Box sx={{ ...headerCellSx, whiteSpace: 'nowrap' }}>Name</Box>
            {expanded && <>
              <Box sx={headerCellSx}>Context</Box>
              <Box sx={headerCellSx}>Sub-type</Box>
              <Box sx={headerCellSx}>Type</Box>
              <Box sx={{ ...headerCellSx, color: 'warning.main' }}>Server [temp]</Box>
            </>}

            {/* ── Data rows ── */}
            {reports.map(report => {
              const base = dataCellSx(report);
              const handleClick = () => {
                onSelectReport(report);
                setExpanded(false);
              };
              const rowEvents = {
                onMouseEnter: () => setHoveredId(report.value),
                onMouseLeave: () => setHoveredId(null),
                onClick: handleClick,
              };
              const rowSx = { ...base, cursor: 'pointer' };

              return (
                <React.Fragment key={report.value}>
                  <Box {...rowEvents} title={report.label} sx={rowSx}>
                    {report.label}
                  </Box>

                  {expanded && <>
                    <Box {...rowEvents} sx={{ ...rowSx, whiteSpace: 'nowrap', color: 'text.secondary' }}>
                      {contextLabel[report.context] ?? report.context}
                    </Box>

                    <Box {...rowEvents} sx={{ ...rowSx, whiteSpace: 'nowrap', color: 'text.secondary' }}>
                      {report.subContext ?? '—'}
                    </Box>

                    <Box {...rowEvents} sx={rowSx}>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 1,
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          bgcolor: report.isCustom ? 'primary.light' : 'grey.200',
                          color: report.isCustom ? 'primary.contrastText' : 'text.secondary',
                        }}
                      >
                        {report.isCustom ? 'Custom' : 'Built-in'}
                      </Box>
                    </Box>

                    {/* Temporary: server type indicator */}
                    <Box {...rowEvents} sx={{ ...rowSx, whiteSpace: 'nowrap', color: 'warning.main', fontSize: '0.7rem' }}>
                      {isCentralServer ? 'Central' : 'Remote'}
                    </Box>
                  </>}
                </React.Fragment>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};
