import React, { FC, useState } from 'react';
import {
  useTranslation,
  DetailContainer,
  DetailSection,
  Box,
  BasicSpinner,
  useDialog,
  DialogButton,
  useKeyboardHeightAdjustment,
  Typography,
  PropertyInput,
  InputWithLabelRow,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import { NameRenderer } from '../..';

interface FacilityEditModalProps {
  nameId: string;
  isOpen: boolean;
  onClose: () => void;
}

// todo: next PR - populate existing from name
const useDraftFacilityProperties = () => {
  const [draftProperties, setDraftProperties] = useState<
    Record<string, string | number | boolean | null>
  >({});

  return {
    draftProperties,
    setDraftProperties,
  };
};

export const FacilityEditModal: FC<FacilityEditModalProps> = ({
  nameId,
  isOpen,
  onClose,
}) => {
  const t = useTranslation();

  const { data, isLoading } = useName.document.get(nameId);
  const { data: properties, isLoading: propertiesLoading } =
    useName.document.properties();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const height = useKeyboardHeightAdjustment(600);

  const { draftProperties, setDraftProperties } = useDraftFacilityProperties();

  const save = async () => {
    // TODO
    console.log(draftProperties);
    onClose();
  };

  if (isLoading || propertiesLoading) return <BasicSpinner />;

  return !!data ? (
    <Modal
      title=""
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={<DialogButton variant="ok" onClick={save} />}
      height={height}
      width={700}
    >
      <DetailContainer>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <NameRenderer
            isStore={!!data.store}
            label={data.name}
            sx={{ fontWeight: 'bold', fontSize: 18 }}
          />

          <Box display="flex">
            <Typography fontWeight="bold">{t('label.code')}:</Typography>
            <Typography paddingX={1}>{data.code}</Typography>
          </Box>
          <DetailSection title="">
            {!properties?.length ? (
              <Typography sx={{ textAlign: 'center' }}>
                {t('messages.no-properties')}
              </Typography>
            ) : (
              <Box
                sx={{
                  width: '500px',
                  display: 'grid',
                  gap: 1,
                }}
              >
                {properties.map(property => (
                  <InputWithLabelRow
                    key={property.key}
                    label={property.name}
                    sx={{ width: '100%' }}
                    labelProps={{
                      sx: {
                        width: '250px',
                        fontSize: '16px',
                        paddingRight: 2,
                        textAlign: 'right',
                      },
                    }}
                    Input={
                      <Box flex={1}>
                        <PropertyInput
                          valueType={property.valueType}
                          allowedValues={property.allowedValues?.split(',')}
                          value={draftProperties[property.key]}
                          onChange={v =>
                            setDraftProperties({
                              ...draftProperties,
                              [property.key]: v ?? null,
                            })
                          }
                        />
                      </Box>
                    }
                  />
                ))}
              </Box>
            )}
          </DetailSection>
        </Box>
      </DetailContainer>
    </Modal>
  ) : null;
};
