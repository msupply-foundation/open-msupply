import React from 'react';
import {
  BasicSpinner,
  InfoTooltipIcon,
  InputWithLabelRow,
  Typography,
} from '@common/components';
import { useTranslation } from '@common/intl';
import { ArrayUtils, Box, PropertyInput } from '@openmsupply-client/common';
import { DraftAsset } from '../../types';
import { useAssets } from '../../api';
import { useIsGapsStoreOnly } from '@openmsupply-client/common';

interface DetailsProps {
  draft?: DraftAsset;
  onChange: (patch: Partial<DraftAsset>) => void;
}

const Container = ({ children }: { children: React.ReactNode }) => (
  <Box
    display="flex"
    flexDirection="column"
    alignContent="center"
    sx={theme => ({
      [theme.breakpoints.down('sm')]: {
        margin: 0,
        padding: 0,
      },
      padding: 4,
    })}
  >
    {children}
  </Box>
);

const Section = ({
  children,
  heading,
}: {
  children: React.ReactNode;
  heading: string;
}) => (
  <Box
    display="flex"
    flexDirection="column"
    padding={2}
    paddingRight={4}
    sx={theme => ({
      [theme.breakpoints.down('sm')]: {
        margin: '0 0 15px 0',
        padding: 0,
      },
      maxWidth: '600px',
      width: '100%',
    })}
  >
    <Heading>{heading}</Heading>
    {children}
  </Box>
);

const Heading = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={theme => ({
      [theme.breakpoints.down('sm')]: {
        marginLeft: '0',
        textAlign: 'center',
        fontSize: '16px!important',
      },
      marginLeft: '158px',
      fontSize: '20px!important',
      fontWeight: 'bold',
    })}
  >
    {children}
  </Typography>
);

const Row = ({
  children,
  tooltip,
  label,
  isGaps,
}: {
  children: React.ReactNode;
  tooltip?: string;
  label: string;
  isGaps: boolean;
}) => {
  if (!isGaps) return (
    <Box paddingTop={1.5}>
      <InputWithLabelRow
        labelWidth="300px"
        label={label}
        labelProps={{
          sx: {
            fontSize: '16px',
            paddingRight: 2,
            textAlign: 'right',
          },
        }}
        Input={
          <>
            <Box sx={{}} flex={1}>
              {children}{' '}
            </Box>
            <Box>
              {tooltip && (
                <InfoTooltipIcon
                  iconSx={{ color: 'gray.main' }}
                  title={tooltip}
                />
              )}
            </Box>
          </>
        }
      />
    </Box>
  );

  return (
    <Box paddingTop={1.5}>
      <Typography
        sx={{
          fontSize: '1rem!important',
          fontWeight: 'bold',
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  )
};

export const Details = ({ draft, onChange }: DetailsProps) => {
  const t = useTranslation();
  const isGaps = useIsGapsStoreOnly();

  const { data: assetProperties, isLoading } = useAssets.properties.list({
    assetCategoryId: { equalAnyOrNull: [draft?.assetCategory?.id ?? ''] },
    assetClassId: { equalAnyOrNull: [draft?.assetClass?.id ?? ''] },
    assetTypeId: { equalAnyOrNull: [draft?.assetType?.id ?? ''] },
  });

  if (!draft) return null;

  return (
    <Box display="flex" flex={3} justifyContent={'center'}>
      <Container>
        {isLoading ? <BasicSpinner /> : null}
        <Section heading={t('label.asset-properties')}>
          {!draft.parsedProperties ? (
            <Typography sx={{ textAlign: 'center' }}>
              {t('messages.no-properties')}
            </Typography>
          ) : (
            <>
              {assetProperties &&
                ArrayUtils.uniqBy(assetProperties, 'key').map(property => {
                  const isCatalogue =
                    draft.parsedCatalogProperties?.hasOwnProperty(
                      property.key
                    ) ?? false;
                  const value =
                    draft.parsedCatalogProperties?.[property.key] ??
                    draft.parsedProperties?.[property.key] ??
                    null;

                  return (
                    <Row
                      key={property.key}
                      label={property.name}
                      tooltip={
                        isCatalogue
                          ? t('messages.catalogue-property')
                          : undefined
                      }
                      isGaps={isGaps}
                    >
                      <PropertyInput
                        valueType={property.valueType}
                        allowedValues={property.allowedValues?.split(',')}
                        value={value}
                        onChange={v =>
                          onChange({
                            parsedProperties: {
                              ...draft.parsedProperties,
                              [property.key]: v ?? null,
                            },
                          })
                        }
                        disabled={isCatalogue}
                      />
                    </Row>
                  );
                })}
            </>
          )}
        </Section>
      </Container>
    </Box>
  );
};
