import React from 'react';
import { Box, Typography } from '@openmsupply-client/common';

type SavedReportOption = {
  label: string;
  value: string;
  template: string;
  context: string;
  isCustom: boolean;
};

interface ReportListProps {
  reports: SavedReportOption[];
  isLoading: boolean;
  selectedReportId: string | null;
  onSelectReport: (report: SavedReportOption) => void;
  onNewReport: () => void;
}

export const ReportList = ({
  reports,
  isLoading,
  selectedReportId,
  onSelectReport,
  onNewReport,
}: ReportListProps) => (
  <Box
    width="240px"
    minWidth="240px"
    display="flex"
    flexDirection="column"
    borderRight="1px solid"
    sx={{ borderColor: 'divider', overflow: 'hidden' }}
  >
    <Typography variant="h6" padding={2} paddingBottom={1}>
      Reports
    </Typography>

    <Box flex={1} sx={{ overflowY: 'auto' }}>
      {/* New report item */}
      <Box
        onClick={onNewReport}
        sx={{
          px: 2,
          py: 1.25,
          cursor: 'pointer',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'primary.main',
          fontWeight: 600,
          fontSize: '0.875rem',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        + New Report
      </Box>

      {isLoading ? (
        <Box px={2} py={1.5}>
          <Typography variant="body2" color="textSecondary">
            Loading...
          </Typography>
        </Box>
      ) : reports.length === 0 ? (
        <Box px={2} py={1.5}>
          <Typography variant="body2" color="textSecondary">
            No saved reports
          </Typography>
        </Box>
      ) : (
        reports.map(report => (
          <Box
            key={report.value}
            onClick={() => onSelectReport(report)}
            sx={{
              px: 2,
              py: 1.25,
              cursor: 'pointer',
              fontSize: '0.875rem',
              bgcolor:
                selectedReportId === report.value ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {report.label}
          </Box>
        ))
      )}
    </Box>
  </Box>
);
