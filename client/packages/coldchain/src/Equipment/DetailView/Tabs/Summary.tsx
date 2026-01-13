import React from 'react';
import {
  AutocompleteMulti,
  BasicTextInput,
  Checkbox,
  DateTimePickerInput,
  InfoTooltipIcon,
  InputWithLabelRow,
  Typography,
} from '@common/components';
import {
  DateUtils,
  LocaleKey,
  useFormatDateTime,
  useTranslation,
} from '@common/intl';
import {
  ArrayUtils,
  Box,
  CLEAR,
  Formatter,
  UNDEFINED_STRING_VALUE,
  useAuthContext,
  useIsCentralServerApi,
  UserPermission,
  StatusChip,
} from '@openmsupply-client/common';
import {
  DonorSearchInput,
  StoreRowFragment,
  StoreSearchInput,
} from '@openmsupply-client/system';
import { DraftAsset } from '../../types';
import { formatLocationLabel } from '../DetailView';
import { useIsGapsStoreOnly } from '@openmsupply-client/common';
import { statusColourMap } from '../../utils';

interface SummaryProps {
  draft?: DraftAsset;
  onChange: (patch: Partial<DraftAsset>) => void;
  locations: {
    label: string;
    value: string;
  }[];
}

const Container = ({ children }: { children: React.ReactNode }) => (
  <Box
    display="flex"
    flex={1}
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
    sx={theme => ({
      [theme.breakpoints.down('sm')]: {
        margin: '0 0 15px 0',
        padding: 0,
      },
      maxWidth: '600px',
      width: '100%',
      padding: 4,
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
  label,
  isGaps,
  tooltip,
}: {
  children: React.ReactNode;
  label: string;
  isGaps: boolean;
  tooltip?: string;
}) => {
  if (!isGaps)
    return (
      <Box paddingTop={1.5}>
        <InputWithLabelRow
          labelWidth="160px"
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
                {children}
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
  );
};

export const Summary = ({ draft, onChange, locations }: SummaryProps) => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();
  const { storeId, userHasPermission } = useAuthContext();
  const isCentralServer = useIsCentralServerApi();
  const isGaps = useIsGapsStoreOnly();
  const isServerAdmin = userHasPermission(UserPermission.ServerAdmin);

  if (!draft) return null;

  const status = draft.statusLog?.status
    ? statusColourMap(draft.statusLog.status)
    : undefined;

  const defaultLocations = draft.locations.nodes.map(location => ({
    label: formatLocationLabel(location),
    value: location.id,
  }));

  const onStoreChange = (store: StoreRowFragment) => {
    onChange({
      store: {
        __typename: 'StoreNode',
        id: store.id,
        code: store.code ?? '',
        storeName: store.storeName,
      },
    });
  };

  const onStoreInputChange = (
    _event: React.SyntheticEvent<Element, Event>,
    _value: string,
    reason: string
  ) => {
    if (reason === CLEAR) onChange({ store: null });
  };

  return (
    <Box
      display="flex"
      flex={1}
      sx={theme => ({
        [theme.breakpoints.down('sm')]: {
          flexDirection: 'column',
        },
      })}
    >
      <Container>
        <Section heading={t('heading.asset-identification')}>
          {isCentralServer && (
            <Row isGaps={isGaps} label={t('label.store')}>
              <StoreSearchInput
                clearable
                fullWidth
                value={draft?.store ?? undefined}
                onChange={onStoreChange}
                onInputChange={onStoreInputChange}
              />
            </Row>
          )}
          <Row isGaps={isGaps} label={t('label.category')}>
            <BasicTextInput
              value={draft.assetCategory?.name ?? ''}
              disabled
              fullWidth
            />
          </Row>
          <Row isGaps={isGaps} label={t('label.type')}>
            <BasicTextInput
              value={draft.assetType?.name ?? ''}
              disabled
              fullWidth
            />
          </Row>
          <Row
            isGaps={isGaps}
            label={t('label.serial')}
            tooltip={
              draft.lockedFields.serialNumber
                ? t('tooltip.defined-by-gs1-matrix')
                : undefined
            }
          >
            <BasicTextInput
              disabled={draft.lockedFields.serialNumber && !isServerAdmin}
              value={draft.serialNumber ?? ''}
              fullWidth
              onChange={e => onChange({ serialNumber: e.target.value })}
            />
          </Row>
          <Row isGaps={isGaps} label={t('label.asset-number')}>
            <BasicTextInput
              value={draft.assetNumber ?? ''}
              fullWidth
              onChange={e => onChange({ assetNumber: e.target.value })}
            />
          </Row>
          <Row isGaps={isGaps} label={t('label.installation-date')}>
            <DateTimePickerInput
              value={DateUtils.getDateOrNull(draft.installationDate)}
              format="P"
              onChange={date =>
                onChange({ installationDate: Formatter.naiveDate(date) })
              }
              width={'100%'}
            />
          </Row>
          <Row isGaps={isGaps} label={t('label.replacement-date')}>
            <DateTimePickerInput
              value={DateUtils.getDateOrNull(draft.replacementDate)}
              format="P"
              onChange={date =>
                onChange({ replacementDate: Formatter.naiveDate(date) })
              }
              width={'100%'}
            />
          </Row>
          <Row
            isGaps={isGaps}
            label={t('label.warranty-start-date')}
            tooltip={
              draft.lockedFields.warrantyStart
                ? t('tooltip.defined-by-gs1-matrix')
                : undefined
            }
          >
            <DateTimePickerInput
              disabled={draft.lockedFields.warrantyStart && !isServerAdmin}
              value={DateUtils.getDateOrNull(draft.warrantyStart)}
              format="P"
              onChange={date =>
                onChange({ warrantyStart: Formatter.naiveDate(date) })
              }
              width={'100%'}
            />
          </Row>
          <Row
            isGaps={isGaps}
            label={t('label.warranty-end-date')}
            tooltip={
              draft.lockedFields.warrantyEnd
                ? t('tooltip.defined-by-gs1-matrix')
                : undefined
            }
          >
            <DateTimePickerInput
              disabled={draft.lockedFields.warrantyEnd && !isServerAdmin}
              value={DateUtils.getDateOrNull(draft.warrantyEnd)}
              format="P"
              onChange={date =>
                onChange({ warrantyEnd: Formatter.naiveDate(date) })
              }
              width={'100%'}
            />
          </Row>
        </Section>
        {(!isCentralServer || draft.storeId == storeId) && (
          <Section heading={t('heading.cold-chain')}>
            <Row isGaps={isGaps} label={t('label.location')}>
              {locations ? (
                <AutocompleteMulti
                  isOptionEqualToValue={(option, value) =>
                    option.value === value.value
                  }
                  defaultValue={defaultLocations}
                  filterSelectedOptions
                  getOptionLabel={option => option.label}
                  inputProps={{ fullWidth: true }}
                  onChange={(
                    _event,
                    newSelectedLocations: {
                      label: string;
                      value: string;
                    }[]
                  ) => {
                    onChange({
                      locationIds: ArrayUtils.dedupe(
                        newSelectedLocations.map(location => location.value)
                      ),
                    });
                  }}
                  options={locations}
                />
              ) : null}
            </Row>
          </Section>
        )}
      </Container>
      <Box
        marginTop={4}
        marginBottom={4}
        sx={theme => ({
          [theme.breakpoints.down('sm')]: {
            display: 'none',
          },
          borderColor: 'gray.light',
          borderWidth: 0,
          borderLeftWidth: 1,
          borderStyle: 'solid',
        })}
      ></Box>
      <Container>
        <Section heading={t('heading.functional-status')}>
          <Row isGaps={isGaps} label={t('label.current-status')}>
            <Box display="flex">
              <StatusChip
                label={t(status?.label as LocaleKey)}
                colour={status?.colour}
              />
            </Box>
          </Row>
          <Row isGaps={isGaps} label={t('label.last-updated')}>
            <BasicTextInput
              value={
                draft.statusLog?.logDatetime &&
                localisedDate(draft.statusLog?.logDatetime)
              }
              disabled
              fullWidth
            />
          </Row>
          <Row isGaps={isGaps} label={t('label.reason')}>
            <BasicTextInput
              value={draft.statusLog?.reason?.reason ?? UNDEFINED_STRING_VALUE}
              disabled
              fullWidth
            />
          </Row>
          <Row isGaps={isGaps} label={t('label.needs-replacement')}>
            <Checkbox
              checked={Boolean(draft.needsReplacement)}
              onChange={e => onChange({ needsReplacement: e.target.checked })}
            />
          </Row>
        </Section>
        <Section heading={t('label.additional-info')}>
          <Row isGaps={isGaps} label={t('label.notes')}>
            <BasicTextInput
              value={draft.notes ?? ''}
              onChange={e => onChange({ notes: e.target.value })}
              fullWidth
              multiline
              rows={4}
            />
          </Row>
        </Section>
        <Section heading={t('label.donor')}>
          <Row isGaps={isGaps} label={t('label.donor')}>
            <DonorSearchInput
              donorId={draft.donor?.id ?? null}
              onChange={e => onChange({ donor: e, donorNameId: e?.id ?? null })}
              clearable
            />
          </Row>
        </Section>
      </Container>
    </Box>
  );
};
