import React, { useMemo, useRef, useState } from 'react';
import {
  BasicTextInput,
  Box,
  ButtonWithIcon,
  DialogButton,
  FnUtils,
  HomeIcon,
  NumericTextInput,
  SlidePanel,
  Typography,
  ViewportList,
  useDebouncedValue,
  useTranslation,
} from '@openmsupply-client/common';
import {
  StoreRowFragment,
  usePaginatedStores,
} from '@openmsupply-client/system';
import { DraftVaccineCourse, DraftVaccineCourseStoreWastage } from '../api';

const DEBOUNCE_TIMEOUT = 300;
const RECORDS_PER_PAGE = 100;

interface StoreWastageProps {
  storeWastageRates: DraftVaccineCourseStoreWastage[];
  updatePatch: (newData: Partial<DraftVaccineCourse>) => void;
}

export const StoreWastagePanel = ({
  storeWastageRates,
  updatePatch,
}: StoreWastageProps) => {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, DEBOUNCE_TIMEOUT);

  const filter = debouncedSearch
    ? { codeOrName: { like: debouncedSearch } }
    : null;

  const { data, fetchNextPage } = usePaginatedStores({
    rowsPerPage: RECORDS_PER_PAGE,
    filter,
  });

  const stores = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data.nodes);
  }, [data?.pages]);

  const totalCount = data?.pages?.[0]?.data.totalCount ?? 0;

  const scrollRef = useRef<HTMLDivElement>(null);

  const updateRate = (store: StoreRowFragment, value: number | null) => {
    const storeId = store.id;
    const existing = storeWastageRates.find(r => r.storeId === storeId);

    if (existing) {
      updatePatch({
        storeWastageRates: storeWastageRates.map(r =>
          r.storeId === storeId ? { ...r, wastageRate: value } : r
        ),
      });
    } else {
      updatePatch({
        storeWastageRates: [
          ...storeWastageRates,
          {
            id: FnUtils.generateUUID(),
            vaccineCourseId: '', // Set in backend when course is saved
            storeId,
            wastageRate: value,
          },
        ],
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSearchText('');
  };

  return (
    <>
      <ButtonWithIcon
        Icon={<HomeIcon />}
        label={t('button.configure-per-store')}
        onClick={() => setOpen(true)}
        shouldShrink={false}
        sx={{ whiteSpace: 'nowrap' }}
      />
      <SlidePanel
        open={open}
        onClose={handleClose}
        title={t('heading.wastage-rate-per-store')}
        cancelButton={<DialogButton variant="back" onClick={handleClose} />}
        okButton={<DialogButton variant="ok" onClick={handleClose} />}
      >
        <Box px={3}>
          <BasicTextInput
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder={t('placeholder.filter-by-store-name')}
            fullWidth
            sx={{ marginBottom: 1 }}
          />
          <Box
            ref={scrollRef}
            sx={{
              maxHeight: 'calc(100vh - 300px)',
              overflowY: 'auto',
            }}
          >
            <ViewportList
              viewportRef={scrollRef}
              items={stores}
              onViewportIndexesChange={([, endIndex]) => {
                if (
                  endIndex >= stores.length - 5 &&
                  stores.length < totalCount
                ) {
                  const nextPage = data?.pages?.length ?? 0;
                  fetchNextPage({ pageParam: nextPage });
                }
              }}
            >
              {store => {
                const rate = storeWastageRates.find(
                  r => r.storeId === store.id
                );
                return (
                  <Box
                    key={store.id}
                    display="flex"
                    justifyContent="space-between"
                    padding={0.5}
                  >
                    <Typography sx={{ fontSize: '14px' }}>
                      {store.storeName}
                    </Typography>
                    <NumericTextInput
                      value={rate?.wastageRate ?? undefined}
                      onChange={value =>
                        updateRate(store, value === undefined ? null : value)
                      }
                      endAdornment="%"
                      decimalLimit={1}
                      max={100}
                      sx={{ width: 100 }}
                    />
                  </Box>
                );
              }}
            </ViewportList>
          </Box>
        </Box>
      </SlidePanel>
    </>
  );
};
