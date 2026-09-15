import React, { useMemo } from 'react';
import {
  FlatButton,
  useTranslation,
  PlusCircleIcon,
  useEditModal,
  IconButton,
  DeleteIcon,
  Typography,
  NumUtils,
  RouteBuilder,
  Link,
  Tooltip,
  Box,
  MaterialTable,
  useSimpleMaterialTable,
  ColumnDef,
  TextWithTooltipCell,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  BundledItemFragment,
  ItemVariantFragment,
  useDeleteBundledItem,
} from '../../../api';
import { BundledItemModal } from './BundledItemModal';

export const BundledItemVariants = ({
  variant,
}: {
  variant: ItemVariantFragment;
}) => {
  const t = useTranslation();

  const { isOpen, onClose, onOpen, entity } =
    useEditModal<BundledItemFragment>();

  const isBundledOnOtherVariants = variant.bundlesWith.length > 0;

  return (
    <Box>
      {isOpen && (
        <BundledItemModal onClose={onClose} bundle={entity} variant={variant} />
      )}

      <Typography fontWeight="bold">{t('title.bundle-with')}</Typography>

      {!isBundledOnOtherVariants && (
        <BundledVariants variant={variant} onOpen={onOpen} />
      )}

      <FlatButton
        disabled={isBundledOnOtherVariants}
        label={t('label.add-bundled-item')}
        onClick={() => onOpen()}
        startIcon={<PlusCircleIcon />}
        color="primary"
      />

      {isBundledOnOtherVariants && (
        <>
          <Typography
            variant="caption"
            fontStyle="italic"
            color="textSecondary"
            marginBottom={2}
            display="block"
          >
            {t('messages.cannot-bundle')}
          </Typography>
          <BundledOn variant={variant} />
        </>
      )}
    </Box>
  );
};

const BundledVariants = ({
  variant,
  onOpen,
}: {
  variant: ItemVariantFragment;
  onOpen: (row?: BundledItemFragment) => void;
}) => {
  const t = useTranslation();

  const deleteBundledItem = useDeleteBundledItem({ itemId: variant.itemId });

  const columns = useMemo(
    (): ColumnDef<BundledItemFragment>[] => [
      {
        id: 'name',
        accessorFn: row => `${row.bundledItemVariant?.itemName} - ${row.bundledItemVariant?.name}`,
        header: t('label.item-variant'),
        Cell: TextWithTooltipCell,
      },
      {
        accessorKey: 'ratio',
        header: t('label.ratio'),
        description: t('description.bundle-ratio'),
        Cell: TextWithTooltipCell,
      },
      {
        accessorKey: 'delete',
        header: t('label.delete'),
        size: 50,
        Cell: ({ row: { original: row } }) => (
          <IconButton
            icon={<DeleteIcon fontSize="small" color="primary" />}
            label={t('label.delete')}
            onClick={e => {
              e.stopPropagation();
              deleteBundledItem(row.id);
            }}
          />
        ),
      },
    ],
    []
  );

  const table = useSimpleMaterialTable<BundledItemFragment>({
    tableId: 'bundled-item-variants',
    data: variant.bundledItemVariants,
    columns,
    onRowClick: onOpen,
  });

  return variant.bundledItemVariants.length > 0 ? <MaterialTable table={table} /> : <p>{t('messages.no-bundled-items')}</p>;
};

const BundledOn = ({ variant }: { variant: ItemVariantFragment }) => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<BundledItemFragment>[] => [
      {
        accessorKey: 'name',
        header: t('label.item-variant'),
        Cell: ({ row: { original: row } }) => (
          <Tooltip
            title={
              row.principalItemVariant?.itemName +
              ' - ' +
              row.principalItemVariant?.name
            }
          >
            <div
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <Link
                to={RouteBuilder.create(AppRoute.Catalogue)
                  .addPart(AppRoute.Items)
                  .addPart(row.principalItemVariant?.itemId ?? '')
                  .addQuery({ tab: t('label.variants') })
                  .build()}
              >
                {row.principalItemVariant?.itemName}
              </Link>{' '}
              - {row.principalItemVariant?.name}
            </div>
          </Tooltip>
        ),
      },
      {
        id: 'ratio',
        accessorFn: row => NumUtils.round(1 / row.ratio, 2),
        header: t('label.ratio'),
        description: t('description.bundled-item-ratio'),
        Cell: TextWithTooltipCell,
      },
    ],
    []
  );

  const table = useSimpleMaterialTable<BundledItemFragment>({
    tableId: 'bundled-on-variants',
    data: variant.bundlesWith,
    columns,
  });

  return <>
    <Typography fontWeight="bold">{t('title.bundled-on')}</Typography>
    {variant.bundlesWith.length > 0 ? <MaterialTable table={table} /> : <p>{t('messages.no-bundled-items')}</p>}
  </>
};
