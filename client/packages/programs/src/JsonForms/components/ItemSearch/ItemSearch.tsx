import React from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  extractProperty,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../../common';
import {
  StockItemSearchInput,
  ItemStockOnHandFragment,
} from '@openmsupply-client/system';

export const itemSearchTester = rankWith(10, uiTypeIs('ItemSearch'));

const UIComponent = (props: ControlProps) => {
  const { handleChange, label, path } = props;
  const { core } = useJsonForms();

  const itemId = extractProperty(core?.data, path);

  const onChange = (item: ItemStockOnHandFragment | null) => {
    handleChange(path, item ? item.id : null);
    handleChange('itemName', item ? item.name : null);
  };

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <StockItemSearchInput
          currentItemId={itemId}
          onChange={onChange}
          width={200}
        />
      }
    />
  );
};

const UIComponentWrapper = (props: ControlProps) => {
  if (!props.visible) {
    return null;
  }
  return <UIComponent {...props} />;
};

export const ItemSearch = withJsonFormsControlProps(UIComponentWrapper);
