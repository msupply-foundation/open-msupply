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
import { DraftVaccineCourse, DraftVaccineCourseStoreConfig } from '../api';

const DEBOUNCE_TIMEOUT = 300;
const RECORDS_PER_PAGE = 100;

interface StoreConfigProps {
  storeConfigs: DraftVaccineCourseStoreConfig[];
  updatePatch: (newData: Partial<DraftVaccineCourse>) => void;
}

export const StoreWastagePanel = ({
  storeConfigs,
  updatePatch,
}: StoreConfigProps) => {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, DEBOUNCE_TIMEOUT);

  const filter = debouncedSearch
    ? { codeOrName: { like: debouncedSearch } }
    : null;

  const { data, fetchNextPage, isFetchingNextPage } = usePaginatedStores({
    rowsPerPage: RECORDS_PER_PAGE,
    filter,
  });

  const stores = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data.nodes);
  }, [data?.pages]);

  const totalCount = data?.pages?.[0]?.data.totalCount ?? 0;

  const scrollRef = useRef<HTMLDivElement>(null);

  const updateConfig = (
    store: StoreRowFragment,
    field: 'wastageRate' | 'coverageRate',
    value: number | null
  ) => {
    const storeId = store.id;
    const existing = storeConfigs.find(r => r.storeId === storeId);

    if (!existing && value == null) {
      return;
    }
    if (existing) {
      updatePatch({
        storeConfigs: storeConfigs.map(r =>
          r.storeId === storeId ? { ...r, [field]: value } : r
        ),
      });
    } else {
      updatePatch({
        storeConfigs: [
          ...storeConfigs,
          {
            id: FnUtils.generateUUID(),
            vaccineCourseId: '', // Set in backend when course is saved
            storeId,
            wastageRate: field === 'wastageRate' ? value : null,
            coverageRate: field === 'coverageRate' ? value : null,
          },
        ],
      });
    }
  };

  const snapshotRef = useRef<DraftVaccineCourseStoreConfig[]>([]);

  const handleOpen = () => {
    snapshotRef.current = storeConfigs;
    setOpen(true);
  };

  const refreshStates = () => {
    setOpen(false);
    setSearchText('');
  };

  const handleBack = () => {
    updatePatch({ storeConfigs: snapshotRef.current });
    refreshStates();
  };

  const headerStyle = {
    fontSize: '14px',
    fontWeight: 'bold',
    width: 100,
    ml: 1,
  };
  const inputProps = {
    endAdornment: '%',
    decimalLimit: 2,
    max: 100,
    width: 100,
    sx: { ml: 1 },
  };

  return (
    <>
      <ButtonWithIcon
        Icon={<HomeIcon />}
        label={t('button.configure-per-store')}
        onClick={handleOpen}
        shouldShrink={false}
        sx={{ whiteSpace: 'nowrap' }}
      />
      <SlidePanel
        open={open}
        onClose={handleBack}
        title={t('heading.configure-rates-per-store')}
        cancelButton={<DialogButton variant="back" onClick={handleBack} />}
        okButton={<DialogButton variant="ok" onClick={refreshStates} />}
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
            display="flex"
            justifyContent="space-between"
            padding={0.5}
            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Typography sx={{ fontSize: '14px', fontWeight: 'bold', flex: 1 }}>
              {t('label.store')}
            </Typography>
            <Typography sx={headerStyle}>{t('label.wastage-rate')}</Typography>
            <Typography sx={headerStyle}>{t('label.coverage-rate')}</Typography>
          </Box>
          <Box
            ref={scrollRef}
            sx={{
              maxHeight: 'calc(100vh - 340px)',
              overflowY: 'auto',
            }}
          >
            <ViewportList
              viewportRef={scrollRef}
              items={stores}
              onViewportIndexesChange={([, endIndex]) => {
                if (
                  endIndex >= stores.length - 5 &&
                  stores.length < totalCount &&
                  !isFetchingNextPage
                ) {
                  const nextPage = data?.pages?.length ?? 0;
                  fetchNextPage({ pageParam: nextPage });
                }
              }}
            >
              {store => {
                const config = storeConfigs.find(r => r.storeId === store.id);
                return (
                  <Box
                    key={store.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    padding={0.5}
                  >
                    <Typography sx={{ fontSize: '14px', flex: 1 }}>
                      {store.storeName}
                    </Typography>
                    <NumericTextInput
                      value={config?.wastageRate ?? undefined}
                      onChange={value =>
                        updateConfig(
                          store,
                          'wastageRate',
                          value === undefined ? null : value
                        )
                      }
                      {...inputProps}
                    />
                    <NumericTextInput
                      value={config?.coverageRate ?? undefined}
                      onChange={value =>
                        updateConfig(
                          store,
                          'coverageRate',
                          value === undefined ? null : value
                        )
                      }
                      {...inputProps}
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
