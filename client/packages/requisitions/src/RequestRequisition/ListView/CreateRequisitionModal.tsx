import React, { FC } from 'react';
import {
  BasicSpinner,
  ModalTabs,
  useDialog,
  useTranslation,
  useWindowDimensions,
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
import { NewRequisitionType } from './types';

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
  const { data: programSettings, isLoading } =
    useRequest.utils.programSettings();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: false });
  const { height: windowHeight } = useWindowDimensions();
  const height = windowHeight * 0.8;

  // const { data, isLoading } = useName.document.internalSuppliers();
  const t = useTranslation('app');
  // const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

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
      height={height}
      width={500}
      slideAnimation={false}
      title={t('label.new-requisition')}
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
