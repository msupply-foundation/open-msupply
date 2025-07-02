import React from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  DownloadIcon,
  EnvUtils,
  FilterIcon,
  Grid,
  Platform,
  PrinterIcon,
  SwipeIcon,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';

interface AppBarButtonsProps {
  onFilterOpen: () => void;
  isFilterDisabled: boolean;
  printReport: () => void;
  exportReport: () => void;
  isPrinting: boolean;
}

export const AppBarButtonsComponent = ({
  onFilterOpen,
  isFilterDisabled,
  printReport,
  exportReport,
  isPrinting,
}: AppBarButtonsProps) => {
  const t = useTranslation();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <Grid
          sx={{ paddingRight: 10, display: 'flex', justifyContent: 'center' }}
        >
          {EnvUtils.platform === Platform.Android && (
            <>
              <SwipeIcon color="disabled" />
              <Typography
                variant="body1"
                sx={{ paddingLeft: 1, color: 'gray.main' }}
              >
                {t('messages.swipe-to-see-more')}
              </Typography>
            </>
          )}
        </Grid>
        <ButtonWithIcon
          disabled={isFilterDisabled}
          label={t('label.filters')}
          Icon={<FilterIcon />}
          onClick={() => onFilterOpen()}
        />
        <ButtonWithIcon
          disabled={isPrinting}
          label={t('button.print')}
          Icon={<PrinterIcon />}
          onClick={() => printReport()}
        />
        <ButtonWithIcon
          disabled={isPrinting}
          label={t('button.export')}
          Icon={<DownloadIcon />}
          onClick={() => exportReport()}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
