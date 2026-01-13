import React, { ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Box,
  InsertAssetLogInput,
  AssetLogStatusNodeType,
  useDebounceCallback,
  LocaleKey,
  useTranslation,
  Autocomplete,
  BasicTextInput,
  InputWithLabelRow,
  Typography,
  useIsGapsStoreOnly,
  UploadFile,
} from '@openmsupply-client/common';
import { FileList } from '../Components';
import { statusColourMap } from '../utils';
import { useAssetLogReasonList } from '@openmsupply-client/system';
import { TakePhotoButton } from './TakePhotoButton';

interface StatusForm {
  draft: Partial<Draft>;
  onChange: (patch: Partial<Draft>) => void;
}

export type Draft = InsertAssetLogInput & { files?: File[] };

const Row = ({
  children,
  label,
  isGaps,
}: {
  children: ReactNode;
  label: string;
  isGaps: boolean;
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
            <Box sx={{}} flex={1}>
              {children}
            </Box>
          }
        />
      </Box>
    );

  return (
    <Box paddingTop={1.5}>
      <Typography
        sx={{
          fontSize: '1em',
          fontWeight: 'bold',
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
};

export const StatusForm = ({ draft, onChange }: StatusForm) => {
  const t = useTranslation();
  const isGaps = useIsGapsStoreOnly();
  const isNative = Capacitor.isNativePlatform();
  const debouncedOnChange = useDebounceCallback(
    (patch: Partial<InsertAssetLogInput>) => onChange(patch),
    [onChange],
    500
  );
  const getOption = (label: string, value?: string) => ({
    label,
    value: value ?? label,
  });

  const getOptionsFromEnum = (
    enumObject: Record<string, string>,
    parser: (value: never) => { label: LocaleKey } | undefined
  ) =>
    Object.values(enumObject).map(value => {
      if (value === undefined) return undefined;
      const parsed = parser(value as never);
      return parsed == undefined
        ? undefined
        : getOption(t(parsed.label), value);
    });

  const statuses = getOptionsFromEnum(AssetLogStatusNodeType, statusColourMap);
  const { data } = useAssetLogReasonList(
    draft.status
      ? {
          assetLogStatus: { equalTo: draft.status },
        }
      : undefined
  );

  const reasons =
    data?.nodes?.map(value => {
      return {
        label: value.reason,
        value: value.id,
      };
    }) ?? [];

  const removeFile = (name: string) => {
    onChange({ files: draft.files?.filter(file => file.name !== name) });
  };

  const onUpload = (files: File[]) => {
    onChange({ files });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        flexDirection: 'column',
        borderColor: theme => theme.palette.divider,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Row label={t('label.new-functional-status')} isGaps={isGaps}>
          <Autocomplete
            isOptionEqualToValue={option => option?.value === draft.status}
            onChange={(_e, selected) =>
              onChange({
                status: selected?.value as AssetLogStatusNodeType,
                reasonId: undefined,
              })
            }
            options={statuses}
            width="100%"
          />
        </Row>
        <Row label={t('label.reason')} isGaps={isGaps}>
          <Autocomplete
            disabled={reasons.length === 0}
            options={reasons}
            width="100%"
            isOptionEqualToValue={option => option?.value === draft.reasonId}
            onChange={(_e, selected) =>
              onChange({ reasonId: selected?.value as string })
            }
            value={reasons.find(r => r?.value === draft.reasonId) ?? null}
          />
        </Row>
        <Row label={t('label.observations')} isGaps={isGaps}>
          <BasicTextInput
            multiline
            rows={4}
            fullWidth
            onChange={e => debouncedOnChange({ comment: e.target.value })}
          />
        </Row>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            marginTop: 2,
            padding: 0,
            alignItems: 'center',
            height: '100%',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {<UploadFile onUpload={onUpload} files={draft.files} />}
          {isNative && (
            <TakePhotoButton onUpload={onUpload} files={draft.files} />
          )}
        </Box>
        <Box sx={{ display: 'flex', width: '300px' }}>
          <FileList
            assetId={draft.id ?? ''}
            files={draft.files}
            padding={0.5}
            removeFile={removeFile}
          />
        </Box>
      </Box>
    </Box>
  );
};
