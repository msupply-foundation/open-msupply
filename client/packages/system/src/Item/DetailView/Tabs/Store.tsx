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
            {isCentralServer && plugins.itemProperties?.ItemSellPrice ? (
              plugins.itemProperties.ItemSellPrice.map((Plugin, index) => (
                <Plugin key={index} item={item} />
              ))
            ) : (
              <SellPriceInput
                value={item.itemStoreProperties?.defaultSellPricePerPack}
                isDisabled={isDisabled}
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
      {isCentralServer &&
        plugins.itemProperties?.ItemFooter?.map((Plugin, index) => (
          <Plugin key={index} itemId={item.id} />
        ))}
    </>
  );
};

// Also used in plugin for consistency
interface SellPriceInputProps {
  value?: string | number;
  isDisabled?: boolean;
  onChange?: (value: number) => void;
}

export const SellPriceInput = ({
  value = 0,
  isDisabled,
  onChange,
}: SellPriceInputProps) => {
  const t = useTranslation();
  return (
    <DetailInputWithLabelRow
      label={t('label.default-sell-price-per-pack')}
      Input={
        <CurrencyInput
          value={value}
          disabled={isDisabled}
          onChangeNumber={onChange ?? (() => {})}
          width={'100%'}
        />
      }
    />
  );
};
