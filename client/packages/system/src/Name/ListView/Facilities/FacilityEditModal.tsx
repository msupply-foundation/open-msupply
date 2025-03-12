import React, { FC, useEffect, useState } from 'react';
import {
  useTranslation,
  DetailContainer,
  DetailSection,
  Box,
  BasicSpinner,
  useDialog,
  DialogButton,
  Typography,
  PropertyInput,
  InputWithLabelRow,
  ObjUtils,
  useIsCentralServerApi,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import { NameRenderer } from '../..';
import { DisplayCoordinates } from './DisplayCoordinates';

interface FacilityEditModalProps {
  nameId: string;
  isOpen: boolean;
  onClose: () => void;
  setNextFacility?: (nameId: string) => void;
}

const useDraftFacilityProperties = (initialProperties?: string | null) => {
  const [draftProperties, setDraftProperties] = useState<
    Record<string, string | number | boolean | null>
  >(ObjUtils.parse(initialProperties));

  useEffect(() => {
    const parsedProperties = ObjUtils.parse(initialProperties);

    setDraftProperties(parsedProperties);
  }, [initialProperties]);

  return {
    draftProperties,
    setDraftProperties,
  };
};

export const FacilityEditModal: FC<FacilityEditModalProps> = ({
  nameId,
  isOpen,
  onClose,
  setNextFacility,
}) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const { data: properties, isLoading: propertiesLoading } =
    useName.document.properties();

  const { data, isLoading } = useName.document.get(nameId);

  const { mutateAsync } = useName.document.updateProperties(nameId);

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const { draftProperties, setDraftProperties } = useDraftFacilityProperties(
    data?.properties
  );

  const nextId = useName.utils.nextFacilityId(nameId);

  const save = async () => {
    mutateAsync({
      id: nameId,
      properties: JSON.stringify(draftProperties),
    });
  };

  if (isLoading || propertiesLoading) return <BasicSpinner />;

  return !!data ? (
    <Modal
      title=""
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            await save();
            onClose();
          }}
        />
      }
      nextButton={
        setNextFacility && (
          <DialogButton
            disabled={!nextId}
            variant="next-and-ok"
            onClick={async () => {
              await save();
              nextId && setNextFacility(nextId);
              // Returning true triggers the animation/slide out
              return true;
            }}
          />
        )
      }
      height={600}
      width={700}
      fullscreen
    >
      <DetailContainer>
        <Box display="flex" flexDirection="column" gap={2}>
          <NameRenderer
            isStore={!!data.store}
            label={data.name}
            sx={{ fontWeight: 'bold', fontSize: 18 }}
          />
          <Box display="flex" flexDirection="column">
            <Box display="flex" flexDirection="row">
              <Typography fontWeight="bold">{t('label.code')}:</Typography>
              <Typography paddingX={1}>{data.code}</Typography>
            </Box>
            <DisplayCoordinates />
          </Box>
          <DetailSection title="">
            {!properties?.length ? (
              <Typography sx={{ textAlign: 'center' }}>
                {t('messages.no-properties')}
              </Typography>
            ) : (
              <Box
                sx={{
                  width: '600px',
                  display: 'grid',
                  gap: 1,
                }}
              >
                {properties.map(nameProperty => (
                  <InputWithLabelRow
                    key={nameProperty.id}
                    label={nameProperty.property.name}
                    sx={{ width: '100%' }}
                    labelProps={{
                      sx: {
                        width: '250px',
                        fontSize: '16px',
                        paddingRight: 2,
                      },
                    }}
                    Input={
                      <Box flex={1}>
                        <PropertyInput
                          disabled={
                            !isCentralServer && !nameProperty.remoteEditable
                          }
                          valueType={nameProperty.property.valueType}
                          allowedValues={nameProperty.property.allowedValues?.split(
                            ','
                          )}
                          value={draftProperties[nameProperty.property.key]}
                          onChange={value =>
                            setDraftProperties({
                              ...draftProperties,
                              [nameProperty.property.key]: value ?? null,
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
