import React, { FC, PropsWithChildren, useState } from 'react';
import { Box, ReportContext, Typography } from '@openmsupply-client/common';
import { AlertIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import {
  CircularProgress,
  FlatButton,
  PaperPopoverSection,
  usePaperClickPopover,
} from '@common/components';
import { ReportArgumentsModal } from './ReportArgumentsModal';
import { JsonData } from '@openmsupply-client/programs';
import { ReportListParams, useReportList } from '../api/hooks';
import { ReportRowFragment } from '../api';

interface ReportSelectorProps {
  context?: ReportContext;
  subContext?: string;
  onPrint: (report: ReportRowFragment, args: JsonData | undefined) => void;
  disabled?: boolean;
  queryParams?: ReportListParams;
}

const NoReports = ({ hasPermission }: { hasPermission: boolean }) => {
  const t = useTranslation();
  return (
    <Box display="flex" alignItems="center" gap={1} padding={2}>
      <Box flex={0}>
        <AlertIcon fontSize="small" color="primary" />
      </Box>
      <Typography flex={1}>
        {t(
          hasPermission
            ? 'error.no-reports-available'
            : 'error.no-report-permission'
        )}
      </Typography>
    </Box>
  );
};

export const ReportSelector: FC<PropsWithChildren<ReportSelectorProps>> = ({
  context,
  subContext,
  children,
  onPrint,
  disabled,
  queryParams,
}) => {
  const { hide, PaperClickPopover } = usePaperClickPopover();
  const { data, isLoading } = useReportList({
    context,
    subContext,
    queryParams,
  });
  const t = useTranslation('app');
  const [reportWithArgs, setReportWithArgs] = useState<
    ReportRowFragment | undefined
  >();
  const onReportSelected = (report: ReportRowFragment | undefined) => {
    if (report === undefined) {
      return;
    }
    if (report.argumentSchema) {
      setReportWithArgs(report);
    } else {
      onPrint(report, undefined);
    }
  };

  const reportButtons = data?.nodes?.map(report => (
    <FlatButton
      label={report.name}
      onClick={() => {
        hide();
        onReportSelected(report);
      }}
      key={report.id}
      sx={{ textAlign: 'left', justifyContent: 'left' }}
    />
  ));

  const hasPermission = !isLoading && data !== undefined;
  const noReports = !isLoading && !data?.nodes?.length;
  const oneReport =
    !isLoading && data?.nodes?.length === 1 ? data.nodes[0] : undefined;

  if (disabled) return <>{children}</>;

  return (
    <>
      {!!oneReport ? (
        <div onClick={() => onReportSelected(oneReport)}>{children}</div>
      ) : (
        <PaperClickPopover
          placement="bottom"
          width={350}
          Content={
            <PaperPopoverSection
              label={t('select-report')}
              labelStyle={{ width: '100%' }}
              alignItems="center"
            >
              {isLoading ? (
                <CircularProgress size={12} />
              ) : (
                <Box
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                  display="flex"
                  flexDirection="column"
                >
                  {noReports ? (
                    <NoReports hasPermission={hasPermission} />
                  ) : (
                    <Box
                      style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                      }}
                      display="flex"
                      flexDirection="column"
                    >
                      {noReports ? (
                        <NoReports hasPermission={hasPermission} />
                      ) : (
                        reportButtons
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </PaperPopoverSection>
          }
        >
          {children}
        </PaperClickPopover>
      )}

      <ReportArgumentsModal
        report={reportWithArgs}
        onReset={() => setReportWithArgs(undefined)}
        onArgumentsSelected={onPrint}
      />
    </>
  );
};
