import React, { FC } from 'react';
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
  PropertyNodeValueType,
  InputWithLabelRow,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import { NameRenderer } from '../..';

interface FacilityEditModalProps {
  nameId: string;
  isOpen: boolean;
  onClose: () => void;
}

const dummyProperties = [
  {
    id: 'admin_level',
    key: 'admin_level',
    name: 'Administration Level',
    allowedValues: 'Primary, Service Point',
    valueType: PropertyNodeValueType.String,
  },
  {
    id: 'facility_type',
    key: 'facility_type',
    name: 'Facility Type',
    allowedValues: 'National Vaccine Store, Regional Vaccine Store',
    valueType: PropertyNodeValueType.String,
  },
];

export const FacilityEditModal: FC<FacilityEditModalProps> = ({
  nameId,
  isOpen,
  onClose,
}) => {
  const { data, isLoading } = useName.document.get(nameId);
  const t = useTranslation('manage');
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const height = useKeyboardHeightAdjustment(600);

  if (isLoading) return <BasicSpinner />;

  return !!data ? (
    <Modal
      title=""
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
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
            {/* todo */}
            {/* {!draft.parsedProperties ? ( */}
            {false ? (
              <Typography sx={{ textAlign: 'center' }}>
                {/* todo */}
                {t('messages.no-properties')}
              </Typography>
            ) : (
              <Box
                sx={{
                  width: '500px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                {dummyProperties &&
                  dummyProperties.map(property => {
                    const value =
                      // draft.parsedCatalogProperties?.[property.key] ??
                      // draft.parsedProperties?.[property.key] ??
                      null;

                    return (
                      <InputWithLabelRow
                        // <DetailInputWithLabelRow
                        key={property.key}
                        labelWidth="250px"
                        label={property.name}
                        sx={{ width: '100%' }}
                        labelProps={{
                          sx: {
                            maxWidth: '300px',
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
                              value={value}
                              onChange={
                                v => console.log(v)
                                // onChange({
                                //   parsedProperties: {
                                //     ...draft.parsedProperties,
                                //     [property.key]: v ?? null,
                                //   },
                                // })
                              }
                            />
                          </Box>
                        }
                      />
                    );
                  })}
              </Box>
            )}
          </DetailSection>
        </Box>
      </DetailContainer>
    </Modal>
  ) : null;
};
