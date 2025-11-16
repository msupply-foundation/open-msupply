import React from 'react';
import {
  DetailContainer,
  DetailInputWithLabelRow,
  useTranslation,
  DetailSection,
  Checkbox,
  Grid,
  NumericTextInput,
  usePluginProvider,
} from '@openmsupply-client/common';
import { ItemFragment } from '../../api';
import { LocationTypeInput } from '../../Components';

interface GeneralTabProps {
  item: ItemFragment;
  isLoading?: boolean;
}

export const GeneralTab = ({ item, isLoading }: GeneralTabProps) => {
  const t = useTranslation();
  const { plugins } = usePluginProvider();

  const isDisabled = true;

  if (isLoading) return null;

  return (
    <DetailContainer>
      <Grid
        container
        flex={1}
        flexDirection="column"
        style={{ maxWidth: 500 }}
        gap={4}
      >
        <DetailSection title={t('title.details')}>
          <DetailInputWithLabelRow
            label={t('label.name')}
            inputProps={{ value: item?.name, disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.code')}
            inputProps={{ value: item?.code, disabled: isDisabled }}
          />

          <DetailInputWithLabelRow
            label={t('label.unit')}
            inputProps={{ value: item?.unitName, disabled: isDisabled }}
          />

          <DetailInputWithLabelRow
            label={t('label.strength')}
            inputProps={{ value: item?.strength, disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.ddd')}
            Input={
              <NumericTextInput
                value={Number(item?.ddd)}
                disabled={isDisabled}
                fullWidth
              />
            }
          />
          <DetailInputWithLabelRow
            label={t('label.type')}
            inputProps={{ value: item?.type, disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.doses')}
            Input={
              <NumericTextInput
                value={item?.doses}
                disabled={isDisabled}
                fullWidth
              />
            }
          />
          <DetailInputWithLabelRow
            label={t('label.is-vaccine')}
            Input={<Checkbox disabled={isDisabled} checked={item?.isVaccine} />}
          />
        </DetailSection>
        <DetailSection title={t('title.categories')}>
          <DetailInputWithLabelRow
            label={t('label.atc-category')}
            inputProps={{ value: item?.atcCategory, disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.universal-name')}
            inputProps={{
              value: item?.msupplyUniversalName,
              disabled: isDisabled,
            }}
          />
          <DetailInputWithLabelRow
            label={t('label.universal-code')}
            inputProps={{
              value: item?.msupplyUniversalCode,
              disabled: isDisabled,
            }}
          />
        </DetailSection>
      </Grid>

      <Grid
        container
        flex={1}
        flexDirection="column"
        style={{ maxWidth: 500 }}
        gap={4}
      >
        <DetailSection title={t('title.storage')}>
          <DetailInputWithLabelRow
            label={t('label.location-type')}
            Input={
              <LocationTypeInput
                onChange={locationType => locationType}
                value={item.restrictedLocationType ?? null}
                disabled={isDisabled}
                fullWidth
              />
            }
          />
        </DetailSection>
        <DetailSection title={t('title.packaging')}>
          <DetailInputWithLabelRow
            label={t('label.default-pack-size')}
            Input={
              <NumericTextInput
                value={item?.defaultPackSize ?? 1}
                disabled={isDisabled}
                fullWidth
              />
            }
          />
          <DetailInputWithLabelRow
            label={t('label.outer-pack-size')}
            Input={
              <NumericTextInput
                value={item?.outerPackSize}
                disabled={isDisabled}
                fullWidth
              />
            }
          />
          <DetailInputWithLabelRow
            label={t('label.volume-per-pack')}
            Input={
              <NumericTextInput
                value={item?.volumePerPack}
                disabled={isDisabled}
                fullWidth
              />
            }
          />
          <DetailInputWithLabelRow
            label={t('label.volume-per-outer-pack')}
            Input={
              <NumericTextInput
                value={item?.volumePerOuterPack}
                disabled={isDisabled}
                fullWidth
              />
            }
          />
          <DetailInputWithLabelRow
            label={t('label.weight')}
            Input={
              <NumericTextInput
                value={item?.weight}
                disabled={isDisabled}
                fullWidth
              />
            }
          />
        </DetailSection>
        <DetailSection title={t('title.pricing')}>
          <DetailInputWithLabelRow
            label={t('label.margin')}
            Input={
              <NumericTextInput
                value={item?.margin}
                disabled={isDisabled}
                fullWidth
              />
            }
          />
        </DetailSection>
        {plugins.item?.detailViewField && (
          <DetailSection title={t('title.catalogue-price')}>
            {plugins.item.detailViewField.map((Plugin, index) => (
              <Plugin key={index} item={item} />
            ))}
          </DetailSection>
        )}
      </Grid>
    </DetailContainer>
  );
};
