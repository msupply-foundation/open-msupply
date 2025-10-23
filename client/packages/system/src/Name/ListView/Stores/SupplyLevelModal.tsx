import React, { useState } from 'react';
import {
  DialogButton,
  useDialog,
  Box,
  BasicTextInput,
  IconButton,
  PlusCircleIcon,
  Typography,
  useTranslation,
  DeleteIcon,
} from '@openmsupply-client/common';
import { useNameProperties } from '../../api/hooks/document/useNameProperties';
import { useConfigureNameProperties } from '../../api/hooks/document/useConfigureNameProperties';

interface SupplyLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupplyLevelModal = ({
  isOpen,
  onClose,
}: SupplyLevelModalProps) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose });
  const { data } = useNameProperties();

  const { mutateAsync } = useConfigureNameProperties();

  const supplyLevelPropertyNode = data?.find(
    p => p.property.key === 'supply_level'
  )?.property;

  const convertedSupplyLevels = supplyLevelPropertyNode?.allowedValues
    ? supplyLevelPropertyNode?.allowedValues.split(',').map(v => v.trim())
    : [];

  const [supplyLevels, setSupplyLevels] = useState(convertedSupplyLevels);
  const [inputValue, setInputValue] = useState('');

  const handleAddSupplyLevel = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !supplyLevels.includes(trimmedValue)) {
      setSupplyLevels([...supplyLevels, trimmedValue]);
      setInputValue('');
    }
  };

  const handleDeleteSupplyLevel = (level: string) =>
    setSupplyLevels(supplyLevels.filter(l => l !== level));

  const handleSaveSupplyLevels = async () => {
    if (!supplyLevelPropertyNode) return;

    await mutateAsync({
      id: supplyLevelPropertyNode.id,
      propertyId: supplyLevelPropertyNode.id,
      key: supplyLevelPropertyNode.key,
      name: supplyLevelPropertyNode.name,
      valueType: supplyLevelPropertyNode.valueType,
      allowedValues: supplyLevels.join(','),
      remoteEditable: true,
    });
    onClose();
  };

  return (
    <Modal
      title="Configure Supply Levels"
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={<DialogButton variant="ok" onClick={handleSaveSupplyLevels} />}
    >
      <>
        <Box
          sx={{ display: 'flex', alignItems: 'center', mb: 2, height: '100%' }}
        >
          <BasicTextInput
            sx={{ width: '250px' }}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddSupplyLevel();
            }}
          />
          <IconButton
            sx={{ marginLeft: 1 }}
            icon={<PlusCircleIcon />}
            label={t('label.add-supply-level')}
            onClick={handleAddSupplyLevel}
            disabled={!inputValue.trim()}
          />
        </Box>
        {supplyLevels.length > 0 ? (
          supplyLevels.map(supplyLevel => (
            <Box
              key={supplyLevel}
              sx={{
                mb: 1,
                pb: 0.5,
                display: 'flex',
                alignItems: 'center',
                '&:not(:last-child)': {
                  borderBottom: '1px dashed',
                },
              }}
            >
              <Typography sx={{ flex: 1 }}>{supplyLevel}</Typography>
              <IconButton
                icon={<DeleteIcon />}
                label={t('label.delete-supply-level')}
                onClick={() => handleDeleteSupplyLevel(supplyLevel)}
              />
            </Box>
          ))
        ) : (
          <Typography>{t('label.no-supply-levels-configured')}</Typography>
        )}
      </>
    </Modal>
  );
};
