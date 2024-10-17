import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  PrinterIcon,
  ReportContext,
  LoadingButton,
  useUrlQueryParams,
  usePluginElements,
} from '@openmsupply-client/common';
import { useInbound } from '../api';
import {
  ReportSelector,
  ReportRowFragment,
  usePrintReport,
} from '@openmsupply-client/system';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { JsonData } from '@openmsupply-client/programs';

interface AppBarButtonProps {
  onAddItem: (newState: boolean) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
}) => {
  const isDisabled = useInbound.utils.isDisabled();
  const { data } = useInbound.document.get();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation(); 
  const { print, isPrinting } = usePrintReport();
  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const pluginButtons = usePluginElements({
    type: 'InboundShipmentAppBar',
    data,
  });

  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined
  ) => {
    if (!data) return;
    print({
      reportId: report.id,
      dataId: data?.id,
      args,
      sort: { key: sortBy.key, desc: sortBy.isDesc },
    });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem(true)}
        />
        <AddFromMasterListButton />
        {pluginButtons}
        <ReportSelector
          context={ReportContext.InboundShipment}
          onPrint={printReport}
        >
          <LoadingButton
            variant="outlined"
            startIcon={<PrinterIcon />}
            isLoading={isPrinting}
          >
            {t('button.print')}
          </LoadingButton>
        </ReportSelector>

        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
