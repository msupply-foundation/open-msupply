import React from 'react';
import {
  DetailContainer,
  DetailInputWithLabelRow,
  useTranslation,
  DetailSection,
  Grid,
  NumericTextDisplay,
  CurrencyInput,
} from '@openmsupply-client/common';
import { ItemFragment } from '../../api';

export const StoreTab = ({ item }: { item: ItemFragment }) => {
  const t = useTranslation();
  const isDisabled = true;

  return (
    <DetailContainer>
      <Grid
        container
        flex={1}
        flexDirection="column"
        style={{ maxWidth: 500 }}
        gap={4}
      >
        <DetailSection title={t('title.pricing')}>
          <DetailInputWithLabelRow
            label={t('label.default-sell-price-per-pack')}
            Input={
              <CurrencyInput
                value={item?.itemStoreJoin?.defaultSellPricePerPack}
                disabled={isDisabled}
                onChangeNumber={() => {}}
              />
            }
            DisabledInput={<NumericTextDisplay value={item?.margin} />}
          />
        </DetailSection>
      </Grid>

      <Grid
        container
        flex={1}
        flexDirection="column"
        style={{ maxWidth: 500 }}
        gap={4}
      ></Grid>
    </DetailContainer>
  );
};
