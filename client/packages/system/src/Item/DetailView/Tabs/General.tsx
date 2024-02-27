import React, { FC } from 'react';
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
import { useItem } from '../../api';
import { VariantControl } from '../../context';
import { PackVariantSelect } from '../../Components';

interface GeneralTabProps {
  variantControl?: VariantControl;
}

export const GeneralTab: FC<GeneralTabProps> = ({ variantControl }) => {
  const t = useTranslation('catalogue');
  const { data, isLoading } = useItem();
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
            inputProps={{ value: data?.name, disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.code')}
            inputProps={{ value: data?.code, disabled: isDisabled }}
          />
          {variantControl ? (
            <DetailInputWithLabelRow
              Input={
                <PackVariantSelect
                  variantControl={variantControl}
                  sx={{ width: '185px' }}
                />
              }
              label={t('label.unit')}
            />
          ) : (
            <DetailInputWithLabelRow
              label={t('label.unit')}
              inputProps={{ value: data?.unitName, disabled: isDisabled }}
            />
          )}
          <DetailInputWithLabelRow
            label={t('label.strength')}
            inputProps={{ value: data?.strength, disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.ddd')}
            inputProps={{ disabled: isDisabled }}
            Input={
              <NumericTextInput
                value={Number(data?.ddd)}
                disabled={isDisabled}
              />
            }
            DisabledInput={<NumericTextDisplay value={data?.ddd} />}
          />
          <DetailInputWithLabelRow
            label={t('label.type')}
            inputProps={{ value: data?.type, disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.doses')}
            inputProps={{ disabled: isDisabled }}
            Input={
              <NumericTextInput value={data?.doses} disabled={isDisabled} />
            }
            DisabledInput={<NumericTextDisplay value={data?.doses} />}
          />
          <DetailInputWithLabelRow
            label={t('label.is-vaccine')}
            Input={<Checkbox disabled={isDisabled} checked={data?.isVaccine} />}
          />
        </DetailSection>
        <DetailSection title={t('title.categories')}>
          <DetailInputWithLabelRow
            label={t('label.atc-category')}
            inputProps={{ value: data?.atcCategory, disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.universal-name')}
            inputProps={{
              value: data?.msupplyUniversalName,
              disabled: isDisabled,
            }}
          />
          <DetailInputWithLabelRow
            label={t('label.universal-code')}
            inputProps={{
              value: data?.msupplyUniversalCode,
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
                value={data?.defaultPackSize}
                disabled={isDisabled}
              />
            }
            DisabledInput={<NumericTextDisplay value={data?.defaultPackSize} />}
            inputProps={{ disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.outer-pack-size')}
            Input={
              <NumericTextInput
                value={data?.outerPackSize}
                disabled={isDisabled}
              />
            }
            DisabledInput={<NumericTextDisplay value={data?.outerPackSize} />}
            inputProps={{ disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.volume-per-pack')}
            Input={
              <NumericTextInput
                value={data?.volumePerPack}
                disabled={isDisabled}
              />
            }
            DisabledInput={<NumericTextDisplay value={data?.volumePerPack} />}
            inputProps={{ disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.volume-per-outer-pack')}
            Input={
              <NumericTextInput
                value={data?.volumePerOuterPack}
                disabled={isDisabled}
              />
            }
            DisabledInput={
              <NumericTextDisplay value={data?.volumePerOuterPack} />
            }
            inputProps={{ disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.weight')}
            Input={
              <NumericTextInput value={data?.weight} disabled={isDisabled} />
            }
            DisabledInput={<NumericTextDisplay value={data?.weight} />}
            inputProps={{ disabled: isDisabled }}
          />
        </DetailSection>
        <DetailSection title={t('title.pricing')}>
          <DetailInputWithLabelRow
            label={t('label.margin')}
            Input={
              <NumericTextInput value={data?.margin} disabled={isDisabled} />
            }
            DisabledInput={<NumericTextDisplay value={data?.margin} />}
            inputProps={{ disabled: isDisabled }}
          />
        </DetailSection>
      </Grid>
    </DetailContainer>
  );
};
