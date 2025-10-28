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
  PropertyNodeValueType,
  useIntlUtils,
  useNotification,
} from '@openmsupply-client/common';
import { useNameProperties } from '@openmsupply-client/system/src/Name/api/hooks/document/useNameProperties';
import { useConfigureCustomProperties } from '../api/hooks/settings/useConfigureNameProperties';
import { getPropertyTranslation } from '../api/hooks/settings/namePropertyData';
import { SUPPLY_LEVEL_KEY } from '../api/hooks/settings/namePropertyKeys';

interface SupplyLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupplyLevelModal = ({
  isOpen,
  onClose,
}: SupplyLevelModalProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const { currentLanguage } = useIntlUtils();
  const { Modal } = useDialog({ isOpen, onClose });

  const { data } = useNameProperties();
  const { mutateAsync } = useConfigureCustomProperties();

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
    const name = getPropertyTranslation(
      'SUPPLY_LEVEL_KEY',
      currentLanguage ?? 'en'
    );

    try {
      await mutateAsync([
        {
          id: '3285c231-ffc2-485b-9a86-5ccafed9a5c5',
          propertyId: SUPPLY_LEVEL_KEY,
          key: SUPPLY_LEVEL_KEY,
          name,
          valueType: PropertyNodeValueType.String,
          allowedValues: supplyLevels.join(','),
          remoteEditable: false,
        },
      ]);
    } catch {
      error(t('error.failed-to-save-supply-level'))();
    }

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
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSupplyLevel();
              }
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
