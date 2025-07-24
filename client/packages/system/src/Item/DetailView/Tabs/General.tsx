import React, { FC } from 'react';
import {
  DetailContainer,
  DetailInputWithLabelRow,
  useTranslation,
  DetailSection,
  Checkbox,
  Grid,
  NumericTextDisplay,
} from '@openmsupply-client/common';
import { useItem } from '../../api';

interface GeneralTabProps {}

export const GeneralTab: FC<GeneralTabProps> = ({}) => {
  const t = useTranslation();
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

          <DetailInputWithLabelRow
            label={t('label.unit')}
            inputProps={{ value: data?.unitName, disabled: isDisabled }}
          />

          <DetailInputWithLabelRow
            label={t('label.strength')}
            inputProps={{ value: data?.strength, disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.ddd')}
            Input={<NumericTextDisplay value={Number(data?.ddd)} />}
          />
          <DetailInputWithLabelRow
            label={t('label.type')}
            inputProps={{ value: data?.type, disabled: isDisabled }}
          />
          <DetailInputWithLabelRow
            label={t('label.doses')}
            Input={<NumericTextDisplay value={data?.doses} />}
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
              <NumericTextDisplay value={data?.defaultPackSize} width={80} />
            }
          />
          <DetailInputWithLabelRow
            label={t('label.outer-pack-size')}
            Input={<NumericTextDisplay value={data?.outerPackSize} />}
          />
          <DetailInputWithLabelRow
            label={t('label.volume-per-pack')}
            Input={<NumericTextDisplay value={data?.volumePerPack} />}
          />
          <DetailInputWithLabelRow
            label={t('label.volume-per-outer-pack')}
            Input={<NumericTextDisplay value={data?.volumePerOuterPack} />}
          />
          <DetailInputWithLabelRow
            label={t('label.weight')}
            Input={<NumericTextDisplay value={data?.weight} />}
          />
        </DetailSection>
        <DetailSection title={t('title.pricing')}>
          <DetailInputWithLabelRow
            label={t('label.margin')}
            Input={<NumericTextDisplay value={data?.margin} />}
          />
        </DetailSection>
      </Grid>
    </DetailContainer>
  );
};
