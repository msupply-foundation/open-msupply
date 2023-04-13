import React, { FC } from 'react';
import {
  BasicSpinner,
  Box,
  ButtonWithIcon,
  ModalTabs,
  PlusCircleIcon,
  Typography,
  useDialog,
  useTranslation,
  useWindowDimensions,
} from '@openmsupply-client/common';

import {
  InternalSupplierSearchModal,
  NameRowFragment,
} from 'packages/system/src';
import { ProgramSettingsFragment, useRequest } from '../api';

interface NewProgramRequistion {
  type: 'program';
  programId: string;
  orderType: string;
  otherPartyId: string;
}

interface NewGeneralRequisition {
  type: 'general';
  name: NameRowFragment;
}

interface CreateRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChange: (
    newRequisition: NewGeneralRequisition | NewProgramRequistion
  ) => void;
}

export const CreateRequisitionModal: FC<CreateRequisitionModalProps> = ({
  isOpen,
  onClose,
  onChange,
}) => {
  const { data: programSettings, isLoading } =
    useRequest.utils.programSettings();
  const { Modal } = useDialog({ isOpen, onClose });
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
                  onChange={onChange}
                  programSettings={programSettings}
                />
              ),
              value: t('label.requisition-program'),
            },
            {
              Component: <GeneralRequisitionOptions onChange={onChange} />,
              value: t('label.requisition-general'),
            },
          ]}
        />
      );

    return <GeneralRequisitionOptions onChange={onChange} />;
  };

  return (
    <Modal
      height={height}
      slideAnimation={false}
      title={t('label.new-requisition')}
    >
      <InnerComponent />
    </Modal>
  );
};

const GeneralRequisitionOptions = ({
  onChange,
}: {
  onChange: CreateRequisitionModalProps['onChange'];
}) => (
  <InternalSupplierSearchModal
    isList={true}
    onChange={name => onChange({ type: 'general', name })}
  />
);

const ProgramRequisitionOptions = ({
  programSettings,
  onChange,
}: {
  onChange: CreateRequisitionModalProps['onChange'];
  programSettings: ProgramSettingsFragment[];
}) => {
  const t = useTranslation('app');
  // TODO in part 2
  return (
    <Box>
      <ButtonWithIcon
        Icon={<PlusCircleIcon />}
        label={t('label.new-requisition')}
        onClick={() =>
          onChange({
            type: 'program',
            programId: 'program_id_here',
            orderType: 'order_type_here',
            otherPartyId: 'other_party_id_here',
          })
        }
      />
      <Typography>{JSON.stringify(programSettings, null, 1)}</Typography>
    </Box>
  );
};
