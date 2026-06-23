import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  AppBarButtonsPortal,
  SplitButton,
  SplitButtonOption,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  ReportContext,
  useUrlQueryParams,
  useUrlQuery,
} from '@openmsupply-client/common';
import { useStocktakeOld } from '../api';
import { ReportSelector } from '@openmsupply-client/system';
import { isStocktakeDisabled } from '../../utils';

interface AppBarButtonProps {
  onAddItem: (newState: boolean) => void;
  openUploadModal: () => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
  openUploadModal,
}) => {
  const { OpenButton } = useDetailPanel();
  const t = useTranslation();
  const { data } = useStocktakeOld.document.get();
  const isDisabled = !data || isStocktakeDisabled(data);

  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const { urlQuery } = useUrlQuery();
  const currentTab = urlQuery['tab'];

  const options: [SplitButtonOption<string>, SplitButtonOption<string>] =
    useMemo(
      () => [
        {
          value: 'add-item',
          label: t('button.add-item'),
          isDisabled,
        },
        {
          // Always enabled: validation sheets are uploaded after the stocktake
          // is finalised, so upload must not be gated by `isDisabled`.
          value: 'upload-document',
          label: t('label.upload-document'),
        },
      ],
      [isDisabled, t]
    );

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(options[0]);

  useEffect(() => {
    // Default to `upload-document` when on the Documents tab, `add-item`
    // otherwise.
    setSelectedOption(currentTab === 'Documents' ? options[1] : options[0]);
  }, [options, currentTab]);

  const handleOptionSelection = (option: SplitButtonOption<string>) => {
    switch (option.value) {
      case 'add-item':
        onAddItem(true);
        break;
      case 'upload-document':
        openUploadModal();
        break;
    }
  };

  const onSelectOption = (option: SplitButtonOption<string>) => {
    setSelectedOption(option);
    handleOptionSelection(option);
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <SplitButton
          color="primary"
          options={options}
          selectedOption={selectedOption}
          onSelectOption={onSelectOption}
          onClick={handleOptionSelection}
          openFrom="bottom"
          Icon={<PlusCircleIcon />}
        />
        <ReportSelector
          context={ReportContext.Stocktake}
          dataId={data?.id ?? ''}
          sort={{ key: sortBy.key, desc: sortBy.isDesc }}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
