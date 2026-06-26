import React from 'react';
import {
  useTranslation,
  DetailContainer,
  DetailInputWithLabelRow,
  DetailSection,
  Checkbox,
  Grid,
  useFormatDateTime,
  Box,
  BasicSpinner,
  MuiLink,
  BasicTextInput,
  ObjUtils,
} from '@openmsupply-client/common';
import { SUPPLY_LEVEL_KEY } from '@openmsupply-client/host/src/api/hooks/settings/namePropertyKeys';
import { useName } from '../api';
import { NameRenderer } from '../Components';

interface DetailsProps {
  nameId: string;
  type?: 'customer' | 'supplier';
}

export const Details = ({ nameId, type = 'customer' }: DetailsProps) => {
  const disabled = true;
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();

  const { data, isLoading } = useName.document.get(nameId);
  const { data: properties } = useName.document.properties();

  const supplyLevelProperty = properties?.find(
    p => p.property.key === SUPPLY_LEVEL_KEY
  )?.property;

  if (isLoading) return <BasicSpinner />;

  return !!data ? (
    <DetailContainer>
      <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
        <NameRenderer
          isStore={!!data?.store}
          label={data?.name}
          sx={{ fontWeight: 'bold', fontSize: 18 }}
        />
        <Grid container flexDirection="row" gap={4}>
          <DetailSection title="">
            <DetailInputWithLabelRow
              label={t('label.code')}
              inputAlignment="start"
              inputProps={{ value: data?.code, disabled }}
            />
            <DetailInputWithLabelRow
              label={t('label.chargeCode')}
              inputProps={{ value: data?.chargeCode, disabled }}
            />
            <DetailInputWithLabelRow
              label={t('label.comment')}
              inputProps={{ value: data?.comment, disabled }}
            />
            <DetailInputWithLabelRow
              label={t('label.phone')}
              inputProps={{ value: data?.phone, disabled }}
            />
            {type === 'supplier' && (
              <>
                <DetailInputWithLabelRow
                  label={t('label.hsh-code')}
                  inputProps={{ value: data?.hshCode, disabled }}
                />
                <DetailInputWithLabelRow
                  label={t('label.hsh-name')}
                  inputProps={{ value: data?.hshName, disabled }}
                />
                <DetailInputWithLabelRow
                  label={t('label.email')}
                  inputProps={{ value: data?.email, disabled }}
                />
              </>
            )}
          </DetailSection>
          <DetailSection title="">
            <DetailInputWithLabelRow
              label={t('label.date-created')}
              inputProps={{
                value: data?.createdDatetime
                  ? localisedDate(data?.createdDatetime)
                  : '',
                disabled,
              }}
            />
            <DetailInputWithLabelRow
              label={t('label.manufacturer')}
              Input={
                <Checkbox disabled={disabled} checked={data?.isManufacturer} />
              }
            />
            <DetailInputWithLabelRow
              label={t('label.donor')}
              Input={<Checkbox disabled={disabled} checked={data?.isDonor} />}
            />
            <DetailInputWithLabelRow
              label={t('label.on-hold')}
              Input={<Checkbox disabled={disabled} checked={data?.isOnHold} />}
            />
            {type === 'supplier' && (
              <>
                <DetailInputWithLabelRow
                  label={t('label.currency')}
                  inputProps={{
                    value: data?.currency?.code,
                    disabled,
                  }}
                />
                <DetailInputWithLabelRow
                  label={t('label.margin')}
                  inputProps={{ value: data?.margin, disabled }}
                />
                <DetailInputWithLabelRow
                  label={t('label.freight-factor')}
                  inputProps={{
                    value: data?.freightFactor,
                    disabled,
                  }}
                />
              </>
            )}
          </DetailSection>
        </Grid>
        <Box
          sx={{
            gap: 1,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
          }}
        >
          <DetailInputWithLabelRow
            label={t('label.address')}
            inputAlignment="start"
            Input={
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 1,
                  width: '100%',
                }}
              >
                <BasicTextInput
                  value={data?.address1}
                  disabled={disabled}
                  fullWidth
                />
                <BasicTextInput
                  value={data?.address2}
                  disabled={disabled}
                  fullWidth
                />
              </Box>
            }
            labelWidthPercentage={19}
          />
          <DetailInputWithLabelRow
            label={t('label.country')}
            inputAlignment="start"
            inputProps={{ value: data?.country, disabled }}
            labelWidthPercentage={19}
          />
          <DetailInputWithLabelRow
            label={t('label.website')}
            inputProps={{ value: data?.website, disabled }}
            inputAlignment="start"
            DisabledInput={
              <MuiLink
                href={data.website ?? undefined}
                target="_blank"
                rel="noopener"
                sx={{
                  // Make it look like another disabled text input consistent with other text
                  // input components in this modal
                  width: '100%',
                  minHeight: '34.13',
                  backgroundColor: theme => theme.palette.background.toolbar,
                  borderRadius: '8px',
                  padding: '4px 8px',
                  // This is to match the width of BasicTextInput (from the required *):
                  marginRight: '2',
                }}
              >
                {data.website}
              </MuiLink>
            }
            labelWidthPercentage={19}
          />
          {type === 'customer' && (
            <DetailInputWithLabelRow
              label={t('label.supply-level')}
              labelWidthPercentage={19}
              inputProps={{
                disabled,
                value:
                  supplyLevelProperty?.key && data?.properties
                    ? (ObjUtils.parse(data?.properties)[
                        supplyLevelProperty.key
                      ] ?? null)
                    : null,
              }}
            />
          )}
        </Box>
      </Box>
    </DetailContainer>
  ) : null;
};
