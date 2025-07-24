import React from 'react';
import {
  DetailContainer,
  DetailInputWithLabelRow,
  useTranslation,
  DetailSection,
  Checkbox,
  Grid,
  NumericTextInput,
  NumericTextDisplay,
} from '@openmsupply-client/common';
import { ItemFragment } from '../../api';

interface GeneralTabProps {
  item: ItemFragment;
  isLoading?: boolean;
}

export const GeneralTab = ({ item, isLoading }: GeneralTabProps) => {
  const t = useTranslation();
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
            inputProps={{ disabled: isDisabled }}
            Input={
              <NumericTextInput
                value={Number(item?.ddd)}
                disabled={isDisabled}
              />
            }
            DisabledInput={<NumericTextDisplay value={item?.ddd} />}
          />
          <DetailInputWithLabelRow
            label={t('label.type')}
            inputProps={{ value: item?.type, disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.doses')}
            inputProps={{ disabled: isDisabled }}
            Input={
              <NumericTextInput value={item?.doses} disabled={isDisabled} />
            }
            DisabledInput={<NumericTextDisplay value={item?.doses} />}
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
        <DetailSection title={t('title.packaging')}>
          <DetailInputWithLabelRow
            label={t('label.default-pack-size')}
            Input={
              <NumericTextInput
                value={item?.defaultPackSize}
                disabled={isDisabled}
              />
            }
            DisabledInput={<NumericTextDisplay value={item?.defaultPackSize} />}
            inputProps={{ disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.outer-pack-size')}
            Input={
              <NumericTextInput
                value={item?.outerPackSize}
                disabled={isDisabled}
              />
            }
            DisabledInput={<NumericTextDisplay value={item?.outerPackSize} />}
            inputProps={{ disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.volume-per-pack')}
            Input={
              <NumericTextInput
                value={item?.volumePerPack}
                disabled={isDisabled}
              />
            }
            DisabledInput={<NumericTextDisplay value={item?.volumePerPack} />}
            inputProps={{ disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.volume-per-outer-pack')}
            Input={
              <NumericTextInput
                value={item?.volumePerOuterPack}
                disabled={isDisabled}
              />
            }
            DisabledInput={
              <NumericTextDisplay value={item?.volumePerOuterPack} />
            }
            inputProps={{ disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.weight')}
            Input={
              <NumericTextInput value={item?.weight} disabled={isDisabled} />
            }
            DisabledInput={<NumericTextDisplay value={item?.weight} />}
            inputProps={{ disabled: isDisabled }}
          />
        </DetailSection>
        <DetailSection title={t('title.pricing')}>
          <DetailInputWithLabelRow
            label={t('label.margin')}
            Input={
              <NumericTextInput value={item?.margin} disabled={isDisabled} />
            }
            DisabledInput={<NumericTextDisplay value={item?.margin} />}
            inputProps={{ disabled: isDisabled }}
          />
        </DetailSection>
      </Grid>
    </DetailContainer>
  );
};
