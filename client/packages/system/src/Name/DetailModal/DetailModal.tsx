import React, { FC, useEffect } from 'react';
import {
  DetailFormSkeleton,
  useTranslation,
  useBreadcrumbs,
  DetailContainer,
  DetailInputWithLabelRow,
  DetailSection,
  Checkbox,
  Grid,
} from '@openmsupply-client/common';
import { useName } from '../api';

interface DetailModalProps {
  nameId: string;
}

export const DetailModal: FC<DetailModalProps> = ({ nameId }) => {
  const { data, isLoading } = useName(nameId);
  const t = useTranslation('common');
  const { setSuffix } = useBreadcrumbs();
  const isDisabled = true;

  useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [data]);

  console.log('data', data);

  if (isLoading) return <DetailFormSkeleton />;

  return !!data ? (
    <DetailContainer>
      <DetailSection title={data?.name}>
        <Grid container flex={1} flexDirection="row" gap={4}>
          <DetailSection title="">
            <DetailInputWithLabelRow
              label={t('label.address')}
              inputProps={{ value: data?.address, disabled: isDisabled }}
            />
            <DetailInputWithLabelRow
              label={t('label.code')}
              inputProps={{ value: data?.code, disabled: isDisabled }}
            />
            <DetailInputWithLabelRow
              label={t('label.chargeCode')}
              inputProps={{ value: data?.chargeCode, disabled: isDisabled }}
            />
            <DetailInputWithLabelRow
              label={t('label.country')}
              inputProps={{ value: data?.country, disabled: isDisabled }}
            />
            <DetailInputWithLabelRow
              label={t('label.comment')}
              inputProps={{ value: data?.comment, disabled: isDisabled }}
            />
            <DetailInputWithLabelRow
              label={t('label.phone')}
              inputProps={{ value: data?.phone, disabled: isDisabled }}
            />
            <DetailInputWithLabelRow
              label={t('label.website')}
              inputProps={{ value: data?.website, disabled: isDisabled }}
            />
          </DetailSection>
          <DetailSection title="">
            <DetailInputWithLabelRow
              label={t('label.date-created')}
              inputProps={{ value: data?.createdDate, disabled: isDisabled }}
            />
            <DetailInputWithLabelRow
              label={t('label.manufacturer')}
              inputProps={{
                value: data?.isManufacturer,
                disabled: isDisabled,
              }}
              Input={
                <Checkbox
                  disabled={isDisabled}
                  checked={data?.isManufacturer}
                />
              }
            />
            <DetailInputWithLabelRow
              label={t('label.donor')}
              inputProps={{
                value: data?.isDonor,
                disabled: isDisabled,
              }}
              Input={<Checkbox disabled={isDisabled} checked={data?.isDonor} />}
            />
            <DetailInputWithLabelRow
              label={t('label.on-hold')}
              inputProps={{
                value: data?.isOnHold,
                disabled: isDisabled,
              }}
              Input={
                <Checkbox disabled={isDisabled} checked={data?.isOnHold} />
              }
            />
          </DetailSection>
        </Grid>
      </DetailSection>
    </DetailContainer>
  ) : null;
};
