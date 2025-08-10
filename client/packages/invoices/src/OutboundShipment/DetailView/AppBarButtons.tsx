import React from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  ReportContext,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useOutbound } from '../api';
import { ReportSelector } from '@openmsupply-client/system';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { AddFromScannerButton } from './AddFromScannerButton';
import { ScannedBarcode } from '../../types';

interface AppBarButtonProps {
  onAddItem: (scanned?: ScannedBarcode) => void;
}

export const AppBarButtonsComponent = ({ onAddItem }: AppBarButtonProps) => {
  const isDisabled = useOutbound.utils.isDisabled();
  const { data } = useOutbound.document.get();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation();
  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem()}
        />
        <AddFromMasterListButton />
        <AddFromScannerButton onAddItem={onAddItem} disabled={isDisabled} />
        <ReportSelector
          context={ReportContext.OutboundShipment}
          dataId={data?.id ?? ''}
          sort={{ key: sortBy.key, desc: sortBy.isDesc }}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
