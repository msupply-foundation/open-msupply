import React, { FC, useEffect, useState } from 'react';
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
  ObjUtils,
  useIsCentralServerApi,
  NamePropertyNode,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import { NameRenderer } from '../..';

interface FacilityEditModalProps {
  nameId: string;
  isOpen: boolean;
  onClose: () => void;
  setNextFacility?: (nameId: string) => void;
  properties?: NamePropertyNode[] | undefined;
  propertiesLoading?: boolean;
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
  properties,
  propertiesLoading,
}) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();

  const { data, isLoading } = useName.document.get(nameId);

  const { mutateAsync } = useName.document.updateProperties(nameId);

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const height = useKeyboardHeightAdjustment(600);

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
            variant="next"
            onClick={async () => {
              await save();
              nextId && setNextFacility(nextId);
              // Returning true triggers the animation/slide out
              return true;
            }}
          />
        )
      }
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
                {properties.map(p => (
                  <InputWithLabelRow
                    key={p.id}
                    label={p.property.name}
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
                          disabled={!isCentralServer && !p.remoteEditable}
                          valueType={p.property.valueType}
                          allowedValues={p.property.allowedValues?.split(',')}
                          value={draftProperties[p.property.key]}
                          onChange={v =>
                            setDraftProperties({
                              ...draftProperties,
                              [p.property.key]: v ?? null,
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
