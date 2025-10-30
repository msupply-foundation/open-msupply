import React from 'react';
import {
  DetailContainer,
  DetailInputWithLabelRow,
  useTranslation,
  DetailSection,
  Grid,
  CurrencyInput,
  Checkbox,
  useIsCentralServerApi,
  usePluginProvider,
} from '@openmsupply-client/common';
import { ItemFragment } from '../../api';

export const StoreTab = ({ item }: { item: ItemFragment }) => {
  const t = useTranslation();
  const isDisabled = true;
  const isCentralServer = useIsCentralServerApi();
  const { plugins } = usePluginProvider();

  const showPlugin = isCentralServer && !!plugins.itemProperties?.ItemSellPrice;

  return (
    <>
      <DetailContainer>
        <Grid
          container
          flex={1}
          flexDirection="column"
          style={{ maxWidth: 500 }}
          gap={4}
        >
          <DetailSection title={t('title.pricing')}>
            {!!showPlugin ? (
              plugins.itemProperties?.ItemSellPrice?.map((Plugin, index) => (
                <Plugin key={index} item={item} />
              ))
            ) : (
              <DetailInputWithLabelRow
                label={t('label.default-sell-price-per-pack')}
                Input={
                  <CurrencyInput
                    value={item?.itemStoreProperties?.defaultSellPricePerPack}
                    disabled={isDisabled}
                    onChangeNumber={() => {}}
                    width={'100%'}
                  />
                }
              />
            )}
          </DetailSection>
        </Grid>

        <Grid
          container
          flex={1}
          flexDirection="column"
          style={{ maxWidth: 500 }}
          gap={4}
        >
          <DetailSection title={t('title.ordering')}>
            <DetailInputWithLabelRow
              label={t('label.ignore-for-orders')}
              Input={
                <Checkbox
                  disabled={isDisabled}
                  checked={item?.itemStoreProperties?.ignoreForOrders}
                />
              }
            />
          </DetailSection>
        </Grid>
      </DetailContainer>
      {showPlugin &&
        plugins.itemProperties?.ItemFooter?.map((Plugin, index) => (
          <Plugin key={index} item={item} />
        ))}
    </>
  );
};
