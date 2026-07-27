import { Show, type JSX } from 'solid-js';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { DetailContainer } from '../../../ui/layout/Detail/DetailContainer';
import { DetailGrid } from '../../../ui/layout/Detail/DetailGrid';
import { DetailRow } from '../../../ui/layout/Detail/DetailRow';
import { RecordNameHeader } from '../../../ui/layout/Detail/RecordNameHeader';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { isStoreName, type NameDetail } from './nameDetail';

// The shared read-only detail FORM for both the customer modal (S3) and the
// supplier Details tab (S4) — one component, differing only by `role` (rules ›
// record detail). Follows the standard detail view
// (spec/ui-standards/detail-views): centred container, record-name header, then
// ONE grid of two-column rows (interleaved left/right) plus full-width rows whose
// values line up with the left column. Everything read-only (AC-N22); supplier
// trade terms are interleaved into the columns (AC-N25); the supply level is a
// customer-only full-width row (AC-N25).
export const NameDetailForm = (props: {
  name: NameDetail;
  role: 'customer' | 'supplier';
  /** Customer supply-level value (v1 name property); ignored for suppliers. */
  supplyLevel?: string;
}): JSX.Element => {
  const n = () => props.name;
  const isSupplier = () => props.role === 'supplier';

  return (
    <DetailContainer>
      <RecordNameHeader
        name={n().name}
        isStore={isStoreName(n())}
        storeLabel={t('name.store-indicator')}
      />

      <DetailGrid>
        {/* Two-column rows: each visual row is a left field then a right field,
            which land in the grid's two [label value] column-pairs. */}
        <DetailRow label={t('name.column.code')} value={n().code} side="left" />
        <DetailRow
          label={t('name.detail.created')}
          value={n().createdDatetime ? localisedDate(n().createdDatetime!) : ''}
          side="right"
        />

        <DetailRow
          label={t('name.detail.charge-code')}
          value={n().chargeCode}
          side="left"
        />
        <DetailRow
          label={t('name.detail.manufacturer')}
          checked={n().isManufacturer}
          side="right"
        />

        <DetailRow
          label={t('name.detail.comment')}
          value={n().comment}
          side="left"
        />
        <DetailRow
          label={t('name.detail.donor')}
          checked={n().isDonor}
          side="right"
        />

        <DetailRow
          label={t('name.detail.phone')}
          value={n().phone}
          side="left"
        />
        <DetailRow
          label={t('name.detail.on-hold')}
          checked={n().isOnHold}
          side="right"
        />

        {/* Supplier trade terms — interleaved into the two columns (AC-N25). */}
        <Show when={isSupplier()}>
          <DetailRow
            label={t('name.detail.hsh-code')}
            value={n().hshCode}
            side="left"
          />
          <DetailRow
            label={t('name.detail.currency')}
            value={n().currency?.code}
            side="right"
          />

          <DetailRow
            label={t('name.detail.hsh-name')}
            value={n().hshName}
            side="left"
          />
          <DetailRow
            label={t('name.detail.margin')}
            value={n().margin}
            side="right"
          />

          <DetailRow
            label={t('name.detail.email')}
            value={n().email}
            side="left"
          />
          <DetailRow
            label={t('name.detail.freight-factor')}
            value={n().freightFactor}
            side="right"
          />
        </Show>

        {/* Full-width rows below the two columns — values span the grid, lining
            up with the left column's fields. */}
        <DetailRow
          label={t('name.detail.address')}
          full
          control={
            <div
              style={{ display: 'flex', gap: 'var(--space-2)', width: '100%' }}
            >
              {/* Two address lines side-by-side, each filling half. */}
              <div style={{ flex: '1 1 0', 'min-width': '0' }}>
                <TextField
                  label={t('name.detail.address1')}
                  hideLabel
                  disabled
                  readOnly
                  width="full"
                  value={n().address1 ?? ''}
                />
              </div>
              <div style={{ flex: '1 1 0', 'min-width': '0' }}>
                <TextField
                  label={t('name.detail.address2')}
                  hideLabel
                  disabled
                  readOnly
                  width="full"
                  value={n().address2 ?? ''}
                />
              </div>
            </div>
          }
        />
        <DetailRow label={t('name.detail.country')} full value={n().country} />
        <DetailRow
          label={t('name.detail.website')}
          full
          control={
            <Show
              when={n().website}
              fallback={
                <TextField
                  label={t('name.detail.website')}
                  hideLabel
                  disabled
                  readOnly
                  width="full"
                  value=""
                />
              }
            >
              {website => (
                <a href={website()} target="_blank" rel="noreferrer">
                  {website()}
                </a>
              )}
            </Show>
          }
        />
        {/* Customer-only supply level — a v1 name property (AC-N25). */}
        <Show when={!isSupplier()}>
          <DetailRow
            label={t('name.detail.supply-level')}
            full
            value={props.supplyLevel ?? ''}
          />
        </Show>
      </DetailGrid>
    </DetailContainer>
  );
};
