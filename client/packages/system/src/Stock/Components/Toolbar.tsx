import React, { FC } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BasicTextInput,
  useTranslation,
} from '@openmsupply-client/common';

interface ToolbarProps {
  filterString: string | null;
  onChangeFilter: (filterString: string) => void;
}

export const Toolbar: FC<ToolbarProps> = ({ filterString, onChangeFilter }) => {
  const t = useTranslation(['common']);

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <InputWithLabelRow
        label={t('label.search')}
        labelWidth={null}
        Input={
          <BasicTextInput
            value={filterString}
            placeholder={t('placeholder.enter-an-item-code-or-name')}
            onChange={e => onChangeFilter(e.target.value)}
          />
        }
      />
    </AppBarContentPortal>
  );
};
