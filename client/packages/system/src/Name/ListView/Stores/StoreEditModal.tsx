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
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const { data: properties, isLoading: propertiesLoading } =
    useName.document.properties();
  const { data, isLoading } = useName.document.get(nameId);
  const { mutateAsync } = useName.document.updateProperties(nameId);
  const nextId = useName.utils.nextStoreId(nameId);

  const { draftProperties, setDraftProperties } = useDraftStoreProperties(
    data?.properties
  );
  const [currentTab, setCurrentTab] = useState(Tabs.Properties);

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
      cancelButton={
        currentTab !== Tabs.Preferences ? (
          <DialogButton variant="cancel" onClick={onClose} />
        ) : undefined
      }
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            if (draftProperties && Object.keys(draftProperties).length > 0) {
              await save();
            }
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
      sx={{
        background: theme => theme.palette.background.toolbar,
        '& .MuiDialogContent-root': { padding: 0, display: 'flex' },
        '& .MuiDialogContent-root > div': { flex: 1 },
      }}
    >
      <DetailContainer paddingLeft={0} paddingRight={0} paddingTop={2}>
        <Box display="flex" flexDirection="column" width="100%">
          <Box padding={4}>
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
          </Box>
          <ModalTabs
            storeId={data.store?.id}
            propertyConfigs={properties ?? []}
            draftProperties={draftProperties}
            updateProperty={patch =>
              setDraftProperties({ ...draftProperties, ...patch })
            }
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
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
  currentTab: Tabs;
  setCurrentTab: (tab: Tabs) => void;
}

const ModalTabs = ({
  storeId,
  propertyConfigs,
  draftProperties,
  updateProperty,
  currentTab,
  setCurrentTab,
}: ModalTabProps) => {
  const t = useTranslation();

  return (
    <TabContext value={currentTab}>
      <TabList
        value={currentTab}
        centered
        onChange={(_, v) => setCurrentTab(v)}
      >
        <Tab value={Tabs.Properties} label={t('label.properties')} />
        {storeId && (
          <Tab value={Tabs.Preferences} label={t('label.preferences')} />
        )}
      </TabList>
      <TabPanel
        value={Tabs.Properties}
        sx={{
          background: theme => theme.palette.background.white,
          height: '100%',
        }}
      >
        <StoreProperties
          propertyConfigs={propertyConfigs}
          draftProperties={draftProperties}
          updateProperty={updateProperty}
        />
      </TabPanel>
      {storeId && (
        <TabPanel
          value={Tabs.Preferences}
          sx={{
            background: theme => theme.palette.background.white,
            height: '100%',
          }}
        >
          <EditStorePreferences storeId={storeId} />
        </TabPanel>
      )}
    </TabContext>
  );
};
