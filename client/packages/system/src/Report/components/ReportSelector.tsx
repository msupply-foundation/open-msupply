import React, { FC } from 'react';
import {
  Box,
  CircularProgress,
  FlatButton,
  PaperPopoverSection,
  ReportCategory,
  usePaperClickPopover,
  useTranslation,
} from '@openmsupply-client/common';
import { ReportRowFragment, useReports } from '../api';

interface ReportSelectorProps {
  category?: ReportCategory;
  onClick: (report: ReportRowFragment) => void;
}

export const ReportSelector: FC<ReportSelectorProps> = ({
  category,
  children,
  onClick,
}) => {
  const { hide, PaperClickPopover } = usePaperClickPopover();
  const { data, isLoading } = useReports(category);
  const t = useTranslation('app');

  const reportButtons = data?.nodes.map(report => (
    <FlatButton
      label={report.name}
      onClick={() => {
        hide();
        onClick(report);
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
