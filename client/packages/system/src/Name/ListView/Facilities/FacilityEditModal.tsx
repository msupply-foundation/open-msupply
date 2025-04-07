import React, {
  Dispatch,
  FC,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
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
  useIsGapsStoreOnly,
  PropertyNodeValueType,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import { NameRenderer } from '../..';
import { DisplayCoordinates } from './DisplayCoordinates';

export type DraftProperty = Record<string, string | number | boolean | null>;

interface DraftFacilityProperties {
  draftProperties: DraftProperty;
  setDraftProperties: Dispatch<SetStateAction<DraftProperty>>;
}

const useDraftFacilityProperties = (
  initialProperties?: string | null
): DraftFacilityProperties => {
  const [draftProperties, setDraftProperties] = useState<DraftProperty>(
    ObjUtils.parse(initialProperties)
  );

  useEffect(() => {
    const parsedProperties = ObjUtils.parse(initialProperties);

    setDraftProperties(parsedProperties);
  }, [initialProperties]);

  return {
    draftProperties,
    setDraftProperties,
  };
};

interface FacilityEditModalProps {
  nameId: string;
  isOpen: boolean;
  onClose: () => void;
  setNextFacility?: (nameId: string) => void;
}

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
  const isGapsStore = useIsGapsStoreOnly();

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
            <DisplayCoordinates
              latitude={(draftProperties['latitude'] as number) ?? 0}
              longitude={(draftProperties['longitude'] as number) ?? 0}
              onDraftPropertiesChange={(latitude, longitude) => {
                setDraftProperties({
                  ...draftProperties,
                  latitude,
                  longitude,
                });
              }}
            />
          </Box>
          <DetailSection title="">
            {!properties?.length ? (
              <Typography sx={{ textAlign: 'center' }}>
                {t('messages.no-properties')}
              </Typography>
            ) : (
              <Box
                sx={theme => ({
                  [theme.breakpoints.down('sm')]: {
                    width: '95%',
                    minWidth: '340px',
                    paddingX: '2em',
                  },
                  width: '600px',
                  display: 'grid',
                  gap: 1,
                })}
              >
                {properties
                  .filter(
                    p =>
                      p.property.key !== 'latitude' &&
                      p.property.key !== 'longitude'
                  )
                  .map(p => (
                    <Row
                      key={p.id}
                      label={p.property.name}
                      isGapsStore={isGapsStore}
                      inputProperties={{
                        disabled: !isCentralServer && !p.remoteEditable,
                        valueType: p.property.valueType,
                        allowedValues: p.property.allowedValues?.split(','),
                        value: draftProperties[p.property.key],
                        onChange: v =>
                          setDraftProperties({
                            ...draftProperties,
                            [p.property.key]: v ?? null,
                          }),
                      }}
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

type PropertyValue = string | number | boolean | undefined;
type PropertyInput = {
  valueType: PropertyNodeValueType;
  allowedValues?: string[];
  value: PropertyValue | null;
  onChange: (value: PropertyValue) => void;
  disabled?: boolean;
};

const Row = ({
  key,
  label,
  isGapsStore,
  inputProperties,
}: {
  key: string;
  label: string;
  isGapsStore: boolean;
  inputProperties: PropertyInput;
}) => {
  if (!isGapsStore)
    return (
      <InputWithLabelRow
        key={key}
        label={label}
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
            <PropertyInput {...inputProperties} />
          </Box>
        }
      />
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
      <PropertyInput {...inputProperties} />
    </Box>
  );
};
