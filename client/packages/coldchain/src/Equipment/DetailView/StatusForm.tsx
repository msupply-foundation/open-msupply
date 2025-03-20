import React from 'react';
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
  useIsScreen,
  Paper,
} from '@openmsupply-client/common';
import { FileList } from '../Components';
import { base64ToBlob, parseLogStatus } from '../utils';
import { useAssetData } from '@openmsupply-client/system';
import { useIsGapsStoreOnly } from '@openmsupply-client/common';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
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
  const isTabletOrMobile = useIsScreen('md') || useIsScreen('sm');
  defineCustomElements(window);
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

  // Add this before taking a picture
  const checkPermissions = async () => {
    console.log('checking permissions')
    const permissionState = await Camera.checkPermissions();
    console.log('permission state', permissionState)
    if (permissionState.camera !== 'granted') {
      const requested = await Camera.requestPermissions();
      if (requested.camera !== 'granted') {
        console.error('Camera permission denied');
        return false;
      }
    }
    return true;
  };

  const takePicture = async () => {

    console.log('taking photo');
    const hasPermission = await checkPermissions();
    console.log('permissions got', hasPermission);
    if (!hasPermission) return;

    try {
      const image = await Camera.getPhoto({
        source: CameraSource.Camera,
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64
      });


      const base64Data = image.base64String;
      const contentType = `image/${image.format}`;

      console.log('file', image);

      if (!base64Data) {
        // throw error?
        return
      }
      const blob = base64ToBlob(base64Data, contentType);

      // Create a File from the blob
      const fileName = `photo_${new Date().getTime()}.${image.format}`;
      const file = new File([blob], fileName, { type: contentType });

      console.log('file', file);
      // Can be set to the src of an image now
      onUpload([file]);

      console.log('got image', image);
    } catch (error) {
      console.error('error', error)
    }
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
        <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          marginTop: 2,
          alignItems: 'center',
        }}>
          <Upload onUpload={onUpload} customWidth={'50%'} />
          {isTabletOrMobile &&
            <Paper
              sx={{
                border: '0px',
                borderWidth: '0px',
                backgroundColor: 'inherit',
                width: '50%',
                marginTop: '0px 0px',
                padding: '0px',
                boxShadow: 'none',
              }}>
              < ButtonWithIcon
                shouldShrink={false}
                color="secondary"
                variant='outlined'
                label={t('button.take-photo')}
                onClick={takePicture}
                Icon={<PlusCircleIcon />}
              /></Paper>}
        </Box>
        <Box display="flex" sx={{ width: '300px' }}>
          <FileList
            assetId={draft.id ?? ''}
            files={draft.files}
            padding={0.5}
            removeFile={removeFile}
          />
        </Box>
      </Box>
    </StyledContainer >
  );
};
