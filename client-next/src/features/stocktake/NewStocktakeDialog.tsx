import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { format, parseISO, subDays } from 'date-fns';
import { useTranslation, type TxKey } from '@/intl';
import { LineEditDialog } from '@/components/detail/LineEditDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/session';
import type { InsertStocktakeInput } from '@/gql/schema';
import { stocktakeSdk } from './api';
import { stocktakeKeys, stocktakeVvmStatusesQueryOptions } from './queries';
import {
  LocationSearchInput,
  MasterListSearchInput,
  VVMStatusSearchInput,
} from './NewStocktakePickers';
import type {
  LocationOptionFragment,
  MasterListOptionFragment,
  VvmStatusOptionFragment,
} from './stocktake.generated';

const route = getRouteApi('/_authenticated/$storeId/stocktake/');

type Mode = 'full' | 'blank' | 'filtered';

const MODES: { value: Mode; labelKey: TxKey; hintKey: TxKey }[] = [
  {
    value: 'full',
    labelKey: 'label.full-stocktake',
    hintKey: 'messages.full-stocktake-hint',
  },
  {
    value: 'filtered',
    labelKey: 'label.filtered-stocktake',
    hintKey: 'messages.filtered-stocktake-hint',
  },
  {
    value: 'blank',
    labelKey: 'label.blank-stocktake',
    hintKey: 'messages.blank-stocktake-hint',
  },
];

/**
 * Create-stocktake dialog. Mirrors the legacy modal's Full / Filtered / Blank
 * modes. Full counts stock-on-hand (or all items); Filtered narrows by master
 * list / location / expiry / VVM status; Blank creates an empty stocktake. The
 * description is auto-generated ("Created by … on …") like the old client, and a
 * comment is auto-generated from the filters when the user leaves it blank.
 */
export function NewStocktakeDialog({
  open,
  storeId,
  onClose,
}: {
  open: boolean;
  storeId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = route.useNavigate();
  const queryClient = useQueryClient();
  const username = useSession(s => s.user?.username ?? '');

  const [mode, setMode] = useState<Mode>('full');
  const [allItems, setAllItems] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Filtered-mode state.
  const [masterList, setMasterList] = useState<MasterListOptionFragment | null>(
    null,
  );
  const [location, setLocation] = useState<LocationOptionFragment | null>(null);
  const [expiresBefore, setExpiresBefore] = useState('');
  const [vvm, setVvm] = useState<VvmStatusOptionFragment | null>(null);
  const [allMasterListItems, setAllMasterListItems] = useState(false);

  const { data: vvmStatuses = [] } = useQuery({
    ...stocktakeVvmStatusesQueryOptions(storeId),
    enabled: open && Boolean(storeId),
  });

  useEffect(() => {
    if (open) {
      setMode('full');
      setAllItems(false);
      setComment('');
      setError(null);
      setMasterList(null);
      setLocation(null);
      setExpiresBefore('');
      setVvm(null);
      setAllMasterListItems(false);
    }
  }, [open]);

  // "All master list items" ignores every other filter on the server, so these
  // are mutually exclusive with it (matches the legacy dialog).
  const otherFilters = Boolean(location || expiresBefore || vvm);

  // Auto-describe the applied filters when the user leaves the comment blank.
  const buildComment = () => {
    const typed = comment.trim();
    if (typed || mode !== 'filtered') return comment;
    const parts: string[] = [];
    if (masterList) parts.push(`${t('label.master-list')}: ${masterList.name}`);
    if (location) parts.push(`${t('label.location')}: ${location.name}`);
    if (expiresBefore)
      parts.push(`${t('label.expires-before')}: ${formatDate(expiresBefore)}`);
    if (vvm) parts.push(`${t('label.vvm-status')}: ${vvm.description}`);
    return parts.join('; ');
  };

  const create = useMutation({
    mutationFn: async () => {
      const description = t('messages.created-by', {
        user: username || t('label.unknown-user'),
        date: formatDate(new Date().toISOString()),
      });
      const input: InsertStocktakeInput = {
        id: crypto.randomUUID(),
        description,
        comment: buildComment().trim() || undefined,
      };
      if (mode === 'blank') input.createBlankStocktake = true;
      else if (mode === 'full') input.isAllItemsStocktake = allItems;
      else {
        input.masterListId = masterList?.id;
        input.locationId = location?.id;
        // Server "expires before" is inclusive (before_or_equal_to); step back a
        // day so the label's strict "before" holds, matching the legacy client.
        // parseISO reads the date-only value as LOCAL midnight (new Date() would
        // treat it as UTC and shift the day west of UTC).
        input.expiresBefore = expiresBefore
          ? format(subDays(parseISO(expiresBefore), 1), 'yyyy-MM-dd')
          : undefined;
        input.vvmStatusId = vvm?.id;
        // "All master list items" is only honoured when the master list is the
        // sole filter; sending it alongside others would silently ignore them.
        if (masterList && !otherFilters)
          input.includeAllMasterListItems = allMasterListItems;
      }

      const res = await stocktakeSdk.insertStocktake({ storeId, input });
      return res.insertStocktake.__typename === 'StocktakeNode'
        ? res.insertStocktake.id
        : null;
    },
    onSuccess: id => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: stocktakeKeys.list(storeId) });
      onClose();
      navigate({
        to: '/$storeId/stocktake/$stocktakeId',
        params: { storeId, stocktakeId: id },
      });
    },
    onError: e => setError(e instanceof Error ? e.message : String(e)),
  });

  const activeMode = MODES.find(m => m.value === mode);

  return (
    <LineEditDialog
      open={open}
      title={t('button.new-stocktake')}
      okLabel={t('button.create')}
      onClose={onClose}
      onOk={() => create.mutate()}
      saving={create.isPending}
      maxWidth="md"
    >
      <div className="flex flex-col gap-4 pt-1">
        <div className="grid gap-1.5">
          <Label>{t('label.stocktake-type')}</Label>
          <div className="flex flex-wrap gap-2">
            {MODES.map(m => (
              <Button
                key={m.value}
                type="button"
                variant={mode === m.value ? 'default' : 'outline'}
                onClick={() => setMode(m.value)}
              >
                {t(m.labelKey)}
              </Button>
            ))}
          </div>
          {activeMode ? (
            <p className="text-sm text-muted-foreground">
              {t(activeMode.hintKey)}
            </p>
          ) : null}
        </div>

        {mode === 'full' ? (
          <div className="grid gap-1.5">
            <Label>{t('label.item')}</Label>
            <div className="flex flex-wrap gap-2">
              <ChoiceButton
                selected={!allItems}
                onClick={() => setAllItems(false)}
                label={t('label.items-with-stock')}
              />
              <ChoiceButton
                selected={allItems}
                onClick={() => setAllItems(true)}
                label={t('label.all-items')}
              />
            </div>
          </div>
        ) : null}

        {mode === 'filtered' ? (
          <>
            <MasterListSearchInput
              storeId={storeId}
              value={masterList}
              onChange={setMasterList}
            />
            {masterList && !otherFilters ? (
              <div className="flex flex-wrap gap-2">
                <ChoiceButton
                  selected={!allMasterListItems}
                  onClick={() => setAllMasterListItems(false)}
                  label={t('label.items-with-stock')}
                />
                <ChoiceButton
                  selected={allMasterListItems}
                  onClick={() => setAllMasterListItems(true)}
                  label={t('label.all-master-list-items')}
                />
              </div>
            ) : null}
            <LocationSearchInput
              storeId={storeId}
              value={location}
              onChange={setLocation}
            />
            <div className="grid gap-1.5">
              <Label>{t('label.expires-before')}</Label>
              <Input
                type="date"
                value={expiresBefore}
                onChange={e => setExpiresBefore(e.target.value)}
              />
            </div>
            {vvmStatuses.length ? (
              <VVMStatusSearchInput
                value={vvm}
                options={vvmStatuses}
                onChange={setVvm}
              />
            ) : null}
          </>
        ) : null}

        <div className="grid gap-1.5">
          <Label>{t('label.comment')}</Label>
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </LineEditDialog>
  );
}

function ChoiceButton({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={selected ? 'default' : 'outline'}
      onClick={onClick}
      className={cn(!selected && 'text-foreground')}
    >
      {label}
    </Button>
  );
}
