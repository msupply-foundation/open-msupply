import React from 'react';
import {
  BasicSpinner,
  ModalTabs,
  useDialog,
  useTranslation,
} from '@openmsupply-client/common';

import {
  InternalSupplierSearchModal,
  NameRowFragment,
} from '@openmsupply-client/system';

import { useRequest } from '../api';
import {
  NewProgramRequisition,
  ProgramRequisitionOptions,
} from './ProgramRequisitionOptions';
import { NewRequisitionType } from '../../types';

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

export const CreateRequisitionModal = ({
  isOpen,
  onClose,
  onCreate,
}: CreateRequisitionModalProps) => {
  const t = useTranslation();
  const { data: programSettings, isLoading } =
    useRequest.utils.programSettings();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: false });
  const noSuppliers = programSettings?.every(
    setting => setting.suppliers.length === 0
  );

  const InnerComponent = () => {
    if (isLoading) return <BasicSpinner />;

    if (programSettings && !noSuppliers)
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
              Component: <GeneralRequisitionOptions onCreate={onCreate} />,
              value: t('label.requisition-general'),
            },
          ]}
        />
      );

    return <GeneralRequisitionOptions onCreate={onCreate} />;
  };

  return (
    <Modal
      height={700}
      width={700}
      slideAnimation={false}
      title={t('label.new-internal-order')}
    >
      <InnerComponent />
    </Modal>
  );
};

const GeneralRequisitionOptions = ({
  onCreate,
}: {
  onCreate: (props: NewGeneralRequisition) => void;
}) => (
  <InternalSupplierSearchModal
    isList={true}
    onChange={name => onCreate({ type: NewRequisitionType.General, name })}
  />
);
