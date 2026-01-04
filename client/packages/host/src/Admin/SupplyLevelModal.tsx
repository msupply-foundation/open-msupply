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
  ObjUtils,
} from '@openmsupply-client/common';
import { useName } from '@openmsupply-client/system/src/Name/api/hooks/';
import { useConfigureCustomProperties } from '../api/hooks/settings/useConfigureNameProperties';
import { getPropertyTranslation } from '../api/hooks/settings/namePropertyData';
import { SUPPLY_LEVEL_KEY } from '../api/hooks/settings/namePropertyKeys';

const useSupplyLevelsInUse = () => {
  const names = useName.document.stores();

  const supplyLevelsInUse: string[] = [];

  names.data?.nodes.forEach(facility => {
    if (facility.properties) {
      const properties = ObjUtils.parse(facility.properties);
      const supplyLevel = properties[SUPPLY_LEVEL_KEY];

      if (supplyLevel && typeof supplyLevel === 'string') {
        const trimmedLevel = supplyLevel.trim();
        if (!supplyLevelsInUse.includes(trimmedLevel)) {
          supplyLevelsInUse.push(trimmedLevel);
        }
      }
    }
  });

  return supplyLevelsInUse;
};

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

  const { data } = useName.document.properties();
  const { mutateAsync } = useConfigureCustomProperties();
  const supplyLevelsInUse = useSupplyLevelsInUse();

  const convertedSupplyLevels =
    data
      ?.find(p => p.property.key === SUPPLY_LEVEL_KEY)
      ?.property.allowedValues?.split(',')
      .map(v => v.trim())
      .filter(v => v !== '') ?? [];

  const [supplyLevels, setSupplyLevels] = useState(convertedSupplyLevels);
  const [inputValue, setInputValue] = useState('');

  const handleAddSupplyLevel = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !supplyLevels.includes(trimmedValue)) {
      setSupplyLevels([...supplyLevels, trimmedValue]);
      setInputValue('');
    }
  };

  const handleDeleteSupplyLevel = (level: string) => {
    setSupplyLevels(supplyLevels.filter(l => l !== level));
  };

  const handleSaveSupplyLevels = async () => {
    try {
      await mutateAsync([
        {
          id: '3285c231-ffc2-485b-9a86-5ccafed9a5c5',
          propertyId: SUPPLY_LEVEL_KEY,
          key: SUPPLY_LEVEL_KEY,
          name: getPropertyTranslation('SUPPLY_LEVEL_KEY', currentLanguage),
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
      title={t('title.configure-supply-levels')}
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
          supplyLevels.map(supplyLevel => {
            const isInUse = supplyLevelsInUse.includes(supplyLevel);

            return (
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
                <Typography sx={{ flex: 1 }}>
                  {supplyLevel}
                  {isInUse && (
                    <Typography
                      component="span"
                      sx={{
                        ml: 1,
                        fontSize: '0.80rem',
                        color: 'text.secondary',
                        fontStyle: 'italic',
                      }}
                    >
                      ({t('label.in-use')})
                    </Typography>
                  )}
                </Typography>
                <IconButton
                  icon={<DeleteIcon />}
                  label={t('label.delete-supply-level')}
                  onClick={() => handleDeleteSupplyLevel(supplyLevel)}
                  disabled={isInUse}
                  sx={{
                    '&.Mui-disabled': {
                      opacity: 0.5,
                    },
                  }}
                />
              </Box>
            );
          })
        ) : (
          <Typography>{t('label.no-supply-levels-configured')}</Typography>
        )}
      </>
    </Modal>
  );
};
