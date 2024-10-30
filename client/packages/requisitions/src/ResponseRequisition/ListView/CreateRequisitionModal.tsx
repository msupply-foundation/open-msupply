import React, { FC } from 'react';
import {
  BasicSpinner,
  Box,
  ModalTabs,
  useDialog,
  useTranslation,
} from '@openmsupply-client/common';
import {
  CustomerSearchModal,
  NameRowFragment,
} from '@openmsupply-client/system';

import { useResponse } from '../api';
import { NewRequisitionType } from '../../types';
import {
  NewProgramRequisition,
  ProgramRequisitionOptions,
} from './ProgramRequisitionOptions';

interface NewGeneralRequisition {
  type: NewRequisitionType.General;
  name: NameRowFragment;
}

interface CreateRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    newRequisition: NewGeneralRequisition | NewProgramRequisition
  ) => void;
}
export const CreateRequisitionModal: FC<CreateRequisitionModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const t = useTranslation();
  const { data: programSettings, isLoading } =
    useResponse.utils.programSettings();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: false });

  const InnerComponent = () => {
    if (isLoading) return <BasicSpinner />;

    if (programSettings && programSettings.length > 0)
      return (
        <ModalTabs
          tabs={[
            {
              Component: (
                <ProgramRequisitionOptions
                  onCreate={onCreate}
                  programSettings={programSettings}
                />
              ),
              value: t('label.requisition-program'),
            },
            {
              Component: (
                <GeneralRequisition
                  onCreate={onCreate}
                  open={isOpen}
                  onClose={onClose}
                />
              ),
              value: t('label.requisition-general'),
            },
          ]}
        />
      );

    return (
      <GeneralRequisition onCreate={onCreate} open={isOpen} onClose={onClose} />
    );
  };

  return (
    <Modal
      height={700}
      width={700}
      slideAnimation={false}
      title={t('label.new-requisition')}
    >
      <InnerComponent />
    </Modal>
  );
};

const GeneralRequisition = ({
  onCreate,
  open,
  onClose,
}: {
  onCreate: (props: NewGeneralRequisition) => void;
  open: boolean;
  onClose: () => void;
}) => (
  <Box paddingTop={2}>
    <CustomerSearchModal
      onChange={name => onCreate({ type: NewRequisitionType.General, name })}
      open={open}
      onClose={onClose}
      isList={true}
    />
  </Box>
);
