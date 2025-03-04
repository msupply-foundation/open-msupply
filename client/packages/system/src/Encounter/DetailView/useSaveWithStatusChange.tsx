import { useEffect, useState } from 'react';
import {
  ButtonWithIcon,
  DialogButton,
  EncounterNodeStatus,
  SaveIcon,
  useDialog,
  useTranslation,
} from '@openmsupply-client/common';
import {
  EncounterFragment,
  EncounterSchema,
} from '@openmsupply-client/programs';
import React from 'react';

/**
+ * Updates the status and once the status has been updated saves the encounter
+ */
export function useSaveWithStatusChange(
  onSave: () => void,
  encounterData: EncounterSchema | undefined,
  updateEncounter: (patch: Partial<EncounterFragment>) => Promise<void>
): {
  showDialog: () => void;
  SaveAsVisitedModal: React.FC;
  saveWithStatusChange: (
    status: EncounterNodeStatus,
    callback: () => void
  ) => void;
} {
  const t = useTranslation();

  const [saveStatus, setSaveStatus] = useState<{
    status: EncounterNodeStatus;
    callback: () => void;
  }>();

  const { Modal, hideDialog, showDialog } = useDialog({
    disableBackdrop: true,
  });

  useEffect(() => {
    if (!!saveStatus && saveStatus.status === encounterData?.status) {
      onSave();
      if (saveStatus.status === EncounterNodeStatus.Visited)
        saveStatus.callback();
    }
  }, [saveStatus, encounterData?.status]);

  const saveWithStatusChange = (
    status: EncounterNodeStatus | undefined,
    callback: () => void = () => {}
  ) => {
    if (status === undefined) {
      // no status change
      onSave();
      return;
    }
    updateEncounter({ status });
    setSaveStatus({ status, callback });
  };

  const SaveAsVisitedModal = () => (
    <Modal
      title={t('messages.save-encounter-as-visited')}
      cancelButton={<DialogButton variant="cancel" onClick={hideDialog} />}
      height={200}
      okButton={
        <DialogButton
          variant="save"
          onClick={() => {
            onSave();
            hideDialog();
          }}
        />
      }
      nextButton={
        <ButtonWithIcon
          color="secondary"
          variant="contained"
          onClick={() => {
            saveWithStatusChange(EncounterNodeStatus.Visited);
            hideDialog();
          }}
          Icon={<SaveIcon />}
          label={t('button-save-as-visited')}
        />
      }
    >
      <></>
    </Modal>
  );

  return {
    showDialog,
    SaveAsVisitedModal,
    saveWithStatusChange,
  };
}
