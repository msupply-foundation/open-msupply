import React from 'react';
import {
  useTranslation,
  NothingHere,
  SlidePanel,
  Box,
  Typography,
} from '@openmsupply-client/common';
import { ItemVariantFragment, useItemVariants } from '../../api';

interface ItemVariantSelectPanelProps {
  itemId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (variant: ItemVariantFragment) => void;
  onManual?: () => void;
}

const VariantCard = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <Box
    component="button"
    onClick={onClick}
    sx={theme => ({
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 4,
      padding: 2,
      cursor: 'pointer',
      background: 'none',
      textAlign: 'left',
      width: '100%',
      '&:hover, &:focus-visible': {
        borderColor: theme.palette.secondary.main,
        backgroundColor: theme.palette.background.toolbar,
      },
      '&:focus-visible': {
        outline: `${theme.palette.secondary.main}`,
        outlineOffset: -2,
      },
    })}
  >
    {children}
  </Box>
);

const VariantDetail = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => {
  if (!value) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight="bold">
        {value}
      </Typography>
    </Box>
  );
};

export const ItemVariantSelectPanel = ({
  itemId,
  open,
  onClose,
  onSelect,
  onManual,
}: ItemVariantSelectPanelProps) => {
  const t = useTranslation();
  const { data } = useItemVariants(itemId);

  const variants = data?.variants ?? [];
  const isVaccine = data?.isVaccine;

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title={t('label.select-item-variant')}
    >
      <Box display="flex" flexDirection="column" gap={2} padding={2}>
        <VariantCard onClick={onManual ?? onClose}>
          <Typography variant="body1" fontWeight="bold">
            {t('heading.enter-values-manually')}
          </Typography>
          <Typography variant="body2">
            {t('messages.do-not-use-variant')}
          </Typography>
        </VariantCard>

        {variants.length === 0 ? (
          <NothingHere body={t('messages.no-item-variants')} />
        ) : (
          variants.map(variant => (
            <VariantCard key={variant.id} onClick={() => onSelect(variant)}>
              <Typography variant="body1" fontWeight="bold" marginBottom={1}>
                {variant.name}
              </Typography>
              <Box display="flex" gap={5}>
                <VariantDetail
                  label={t('label.manufacturer')}
                  value={variant.manufacturer?.name}
                />
                {isVaccine && (
                  <VariantDetail
                    label={t('label.vvm-type')}
                    value={variant.vvmType}
                  />
                )}
              </Box>
            </VariantCard>
          ))
        )}
      </Box>
    </SlidePanel>
  );
};
