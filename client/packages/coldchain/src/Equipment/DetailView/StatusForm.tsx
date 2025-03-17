import React, { useState } from 'react';
import {
  Autocomplete,
  BasicTextInput,
  ButtonWithIcon,
  InputWithLabelRow,
  Typography,
  Upload
} from '@common/components';
import { LocaleKey, useTranslation } from '@common/intl';
import {
  AssetLogStatusInput,
  Box,
  InsertAssetLogInput,
  StatusType,
  useDebounceCallback,
  styled,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import { FileList } from '../Components';
import { parseLogStatus } from '../utils';
import { useAssetData } from '@openmsupply-client/system';
import { useIsGapsStoreOnly } from '@openmsupply-client/common';
import { Camera, CameraResultType } from '@capacitor/camera';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

const StyledContainer = styled(Box)(({ theme }) => ({
  borderColor: theme.palette.divider,
  flexDirection: 'column',
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  width: '100%',
}));

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
  children: React.ReactNode;
  label: string;
  isGaps: boolean;
}) => {

  if (!isGaps) return (
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
    </Box>);

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
  )
};

export const StatusForm = ({ draft, onChange }: StatusForm) => {
  const t = useTranslation();
  defineCustomElements(window);
  const [imageElement, setImageElement] = useState<any>({ src: undefined })
  const isGaps = useIsGapsStoreOnly();
  const debouncedOnChange = useDebounceCallback(
    (patch: Partial<InsertAssetLogInput>) => onChange(patch),
    [onChange],
    500
  );
  const getOption = (label: string, value?: string) => ({
    label,
    value: value ?? label,
  });

  const takePicture = async () => {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri
    });

    // image.webPath will contain a path that can be set as an image src.
    // You can access the original file using image.path, which can be
    // passed to the Filesystem API to read the raw data of the image,
    // if desired (or pass resultType: CameraResultType.Base64 to getPhoto)
    var imageUrl = image.webPath;

    // Can be set to the src of an image now
    setImageElement({ ...imageElement, src: imageUrl })

  };

  const getOptionsFromEnum = (
    enumObject: Record<string, string>,
    parser: (value: never) => { key: LocaleKey } | undefined
  ) =>
    Object.values(enumObject).map(value => {
      if (value === undefined) return undefined;
      const parsed = parser(value as never);
      return parsed == undefined ? undefined : getOption(t(parsed.key), value);
    });

  const statuses = getOptionsFromEnum(StatusType, parseLogStatus);
  const { data } = useAssetData.log.listReasons(
    draft.status
      ? {
        assetLogStatus: { equalTo: draft.status },
      }
      : undefined
  );

  const removeFile = (name: string) => {
    onChange({ files: draft.files?.filter(file => file.name !== name) });
  };

  const onUpload = (files: File[]) => {
    onChange({ files });
  };

  const reasons =
    data?.nodes?.map(value => {
      return {
        label: value.reason,
        value: value.id,
      };
    }) ?? [];

  return (
    <StyledContainer>
      <Box display="flex" flexDirection="column" sx={{ width: '100%' }}>
        <Row label={t('label.new-functional-status')} isGaps={isGaps}>
          <Autocomplete
            isOptionEqualToValue={option => option?.value === draft.status}
            onChange={(_e, selected) =>
              onChange({
                status: selected?.value as AssetLogStatusInput,
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
        <Box padding={2}>
          <Upload onUpload={onUpload} />
          <ButtonWithIcon
            Icon={<PlusCircleIcon />}
            label={t('button.take-photo')}
            onClick={takePicture}
          />
          <Box display="flex" sx={{ width: '300px' }}>
            <FileList
              assetId={draft.id ?? ''}
              files={draft.files}
              padding={0.5}
              removeFile={removeFile}
            />
          </Box>
        </Box>
      </Box>

    </StyledContainer >
  );
};
