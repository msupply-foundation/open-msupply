import React, { useState } from 'react';
import {
  useTranslation,
  DetailContainer,
  Box,
  BasicSpinner,
  useDialog,
  DialogButton,
  Typography,
  TabList,
  Tab,
  TabContext,
  TabPanel,
  NamePropertyNode,
  useIsGapsStoreOnly,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import { NameRenderer } from '../..';
import { DisplayCoordinates } from './DisplayCoordinates';
import { StoreProperties } from './StoreProperties';
import {
  DraftProperties,
  useDraftStoreProperties,
} from './useDraftStoreProperties';
import { EditStorePreferences } from './EditStorePreferences';

interface StoreEditModalProps {
  nameId: string;
  isOpen: boolean;
  onClose: () => void;
  setNextStore?: (nameId: string) => void;
}

export const StoreEditModal = ({
  nameId,
  isOpen,
  onClose,
  setNextStore,
}: StoreEditModalProps) => {
  const t = useTranslation();

  const { data: properties, isLoading: propertiesLoading } =
    useName.document.properties();

  const { data, isLoading } = useName.document.get(nameId);

  const { mutateAsync } = useName.document.updateProperties(nameId);

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const { draftProperties, setDraftProperties } = useDraftStoreProperties(
    data?.properties
  );

  const nextId = useName.utils.nextStoreId(nameId);

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
        setNextStore && (
          <DialogButton
            disabled={!nextId}
            variant="next-and-ok"
            onClick={async () => {
              await save();
              nextId && setNextStore(nextId);
              // Returning true triggers the animation/slide out
              return true;
            }}
          />
        )
      }
      height={1000}
      width={800}
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
          <ModalTabs
            storeId={data.store?.id}
            propertyConfigs={properties ?? []}
            draftProperties={draftProperties}
            updateProperty={patch =>
              setDraftProperties({ ...draftProperties, ...patch })
            }
          />
        </Box>
      </DetailContainer>
    </Modal>
  ) : null;
};

export enum Tabs {
  Properties = 'Properties',
  Preferences = 'Preferences',
}

interface ModalTabProps {
  storeId: string | undefined;
  propertyConfigs: NamePropertyNode[];
  draftProperties: DraftProperties;
  updateProperty: (update: DraftProperties) => void;
}

const ModalTabs = ({
  storeId,
  propertyConfigs,
  draftProperties,
  updateProperty,
}: ModalTabProps) => {
  const t = useTranslation();
  const isGapsMobileStore = useIsGapsStoreOnly();
  const [currentTab, setCurrentTab] = useState(
    storeId && !isGapsMobileStore ? Tabs.Preferences : Tabs.Properties
  );

  return (
    <TabContext value={currentTab}>
      <TabList
        value={currentTab}
        centered
        onChange={(_, v) => setCurrentTab(v)}
      >
        {storeId && (
          <Tab value={Tabs.Preferences} label={t('label.preferences')} />
        )}
        <Tab value={Tabs.Properties} label={t('label.properties')} />
      </TabList>
      {storeId && (
        <TabPanel value={Tabs.Preferences}>
          <EditStorePreferences storeId={storeId} />
        </TabPanel>
      )}
      <TabPanel value={Tabs.Properties}>
        <StoreProperties
          propertyConfigs={propertyConfigs}
          draftProperties={draftProperties}
          updateProperty={updateProperty}
        />
      </TabPanel>
    </TabContext>
  );
};
