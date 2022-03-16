import React, { FC } from 'react';
import {
  Box,
  CircularProgress,
  FlatButton,
  PaperPopoverSection,
  usePaperClickPopover,
  useTranslation,
} from '@openmsupply-client/common';
import { ReportRowFragment, useReports } from '../api';

export const ReportSelector: FC = ({ children }) => {
  const { hide, PaperClickPopover } = usePaperClickPopover();
  const { data, isLoading } = useReports();
  const t = useTranslation('app');
  const printReport = (report: ReportRowFragment) => {
    alert(`Printing ${report.name}`);
  };

  const reportButtons = data?.nodes.map(report => (
    <FlatButton
      label={report.name}
      onClick={() => {
        hide();
        printReport(report);
      }}
      key={report.id}
      sx={{ textAlign: 'left', justifyContent: 'left' }}
    />
  ));
  return (
    <PaperClickPopover
      placement="bottom"
      width={350}
      Content={
        <PaperPopoverSection label={t('select-report')}>
          {isLoading ? (
            <CircularProgress size={12} />
          ) : (
            <Box
              style={{ maxHeight: '200px', overflowY: 'auto' }}
              display="flex"
              flexDirection="column"
            >
              {reportButtons}
            </Box>
          )}
        </PaperPopoverSection>
      }
    >
      {children}
    </PaperClickPopover>
  );
};
