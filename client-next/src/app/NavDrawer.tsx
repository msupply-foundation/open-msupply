import { useState, type ReactNode } from 'react';
import {
  LayoutDashboardIcon,
  TruckIcon,
  DownloadIcon,
  PackageIcon,
  PillIcon,
  SnowflakeIcon,
  BookOpenIcon,
  BarChart3Icon,
  SlidersHorizontalIcon,
  SettingsIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  LogOutIcon,
  ChevronsUpDownIcon,
  CircleUserRoundIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Link,
  useNavigate,
  useParams,
  useRouterState,
} from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useSession } from '@/app/session';
import { useTranslation, type TxKey } from '@/intl';
import { syncStatusQueryOptions } from '@/features/sync/queries';
import { MSupplyGuy } from '@/components/MSupplyGuy';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export const DRAWER_WIDTH = 240;

interface NavLeaf {
  to: string;
  labelKey: TxKey;
}
interface NavEntry {
  id: string;
  labelKey: TxKey;
  icon: ReactNode;
  /** Single destination (no children). */
  to?: string;
  exact?: boolean;
  children?: NavLeaf[];
}

// The full app menu. Children point at real routes (stock/stocktake) or skeleton
// placeholder routes until each feature lands.
const UPPER: NavEntry[] = [
  {
    id: 'dashboard',
    labelKey: 'app.dashboard',
    icon: <LayoutDashboardIcon className="size-5" />,
    to: '/',
    exact: true,
  },
  {
    id: 'distribution',
    labelKey: 'app.distribution',
    icon: <TruckIcon className="size-5" />,
    children: [
      {
        to: '/distribution/outbound-shipment',
        labelKey: 'app.outbound-shipment',
      },
      {
        to: '/distribution/customer-requisition',
        labelKey: 'app.customer-requisition',
      },
      { to: '/distribution/customer-return', labelKey: 'app.customer-return' },
      { to: '/distribution/customers', labelKey: 'app.customers' },
    ],
  },
  {
    id: 'replenishment',
    labelKey: 'app.replenishment',
    icon: <DownloadIcon className="size-5" />,
    children: [
      { to: '/replenishment/internal-order', labelKey: 'app.internal-order' },
      {
        to: '/replenishment/inbound-shipment',
        labelKey: 'app.inbound-shipment',
      },
      { to: '/replenishment/supplier-return', labelKey: 'app.supplier-return' },
      { to: '/replenishment/suppliers', labelKey: 'app.suppliers' },
    ],
  },
  {
    id: 'inventory',
    labelKey: 'app.inventory',
    icon: <PackageIcon className="size-5" />,
    children: [
      { to: '/stock', labelKey: 'app.stock' },
      { to: '/stocktake', labelKey: 'app.stocktakes' },
      { to: '/inventory/locations', labelKey: 'app.locations' },
    ],
  },
  {
    id: 'dispensary',
    labelKey: 'app.dispensary',
    icon: <PillIcon className="size-5" />,
    children: [
      { to: '/dispensary/patients', labelKey: 'app.patients' },
      { to: '/dispensary/prescription', labelKey: 'app.prescription' },
      { to: '/dispensary/clinicians', labelKey: 'app.clinicians' },
    ],
  },
  {
    id: 'cold-chain',
    labelKey: 'app.cold-chain',
    icon: <SnowflakeIcon className="size-5" />,
    children: [
      { to: '/cold-chain/equipment', labelKey: 'app.equipment' },
      { to: '/cold-chain/monitoring', labelKey: 'app.monitoring' },
      { to: '/cold-chain/sensors', labelKey: 'app.sensors' },
    ],
  },
  {
    id: 'catalogue',
    labelKey: 'app.catalogue',
    icon: <BookOpenIcon className="size-5" />,
    children: [
      { to: '/catalogue/items', labelKey: 'app.items' },
      { to: '/catalogue/assets', labelKey: 'app.assets' },
      { to: '/catalogue/master-lists', labelKey: 'app.master-lists' },
    ],
  },
  {
    id: 'reports',
    labelKey: 'app.reports',
    icon: <BarChart3Icon className="size-5" />,
    to: '/reports',
  },
];

const LOWER: NavEntry[] = [
  {
    id: 'manage',
    labelKey: 'app.manage',
    icon: <SlidersHorizontalIcon className="size-5" />,
    children: [
      { to: '/manage/stores', labelKey: 'app.stores' },
      { to: '/manage/campaigns', labelKey: 'app.campaigns' },
      { to: '/manage/global-preferences', labelKey: 'app.global-preferences' },
    ],
  },
  {
    id: 'settings',
    labelKey: 'app.settings',
    icon: <SettingsIcon className="size-5" />,
    to: '/settings',
  },
];

function isPathActive(pathname: string, to: string, exact?: boolean): boolean {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

// `to` values are store-relative ('/', '/stock', …); prefix with the active
// store so links and active-state match the /$storeId/… URLs.
type WithStore = (to: string) => string;

function isEntryActive(
  pathname: string,
  entry: NavEntry,
  withStore: WithStore,
): boolean {
  if (entry.to) return isPathActive(pathname, withStore(entry.to), entry.exact);
  return (entry.children ?? []).some(c =>
    isPathActive(pathname, withStore(c.to)),
  );
}

interface NavDrawerProps {
  /** Controls the temporary (mobile) drawer; ignored by the permanent one. */
  mobileOpen: boolean;
  onClose: () => void;
  /** Opens the sync modal (Sync is an action, not a destination). */
  onOpenSync: () => void;
}

const leafClass = (active: boolean) =>
  cn(
    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
    active && 'bg-accent font-medium text-accent-foreground',
  );

export function NavDrawer({ mobileOpen, onClose, onOpenSync }: NavDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSession(s => s.user);
  const store = useSession(s => s.store);
  const stores = useSession(s => s.stores);
  const clear = useSession(s => s.clear);

  const [accountOpen, setAccountOpen] = useState(false);
  const [storeQuery, setStoreQuery] = useState('');
  const closeAccount = () => {
    setAccountOpen(false);
    setStoreQuery('');
  };
  const filteredStores = stores.filter(s =>
    `${s.name} ${s.code}`.toLowerCase().includes(storeQuery.toLowerCase()),
  );

  // Switch store: go to the chosen store's dashboard (data is store-scoped by the
  // URL, so we can't keep the current page's params across stores).
  const switchStore = (id: string) => {
    closeAccount();
    onClose(); // close the mobile overlay
    navigate({ to: '/$storeId', params: { storeId: id } });
  };

  // Slow background poll keeps the push-queue badge fresh; the modal polls fast.
  const { data: syncStatus } = useQuery({
    ...syncStatusQueryOptions(),
    refetchInterval: 60_000,
  });
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { storeId } = useParams({ strict: false });
  const withStore: WithStore = to =>
    to === '/' ? `/${storeId}` : `/${storeId}${to}`;

  // User-toggled expansion overrides; otherwise a section auto-expands when it
  // contains the active route.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isExpanded = (entry: NavEntry) =>
    overrides[entry.id] ?? isEntryActive(pathname, entry, withStore);
  const toggle = (id: string, currentlyOpen: boolean) =>
    setOverrides(prev => ({ ...prev, [id]: !currentlyOpen }));

  const onLogout = () => {
    clear();
    onClose();
    navigate({ to: '/login' });
  };

  const pushCount = syncStatus?.numberOfRecordsInPushQueue ?? 0;

  const renderEntry = (entry: NavEntry) => {
    // Leaf section (single destination).
    if (entry.to) {
      return (
        <Link
          key={entry.id}
          to={withStore(entry.to)}
          onClick={onClose}
          className={leafClass(isEntryActive(pathname, entry, withStore))}
        >
          <span className="shrink-0">{entry.icon}</span>
          <span className="truncate">{t(entry.labelKey)}</span>
        </Link>
      );
    }

    // Parent section with collapsible children.
    const open = isExpanded(entry);
    return (
      <Collapsible
        key={entry.id}
        open={open}
        onOpenChange={() => toggle(entry.id, open)}
      >
        <CollapsibleTrigger
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <span className="shrink-0">{entry.icon}</span>
          <span className="grow truncate text-start">{t(entry.labelKey)}</span>
          {open ? (
            <ChevronDownIcon className="size-4 shrink-0" />
          ) : (
            <ChevronRightIcon className="size-4 shrink-0" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-0.5 space-y-0.5">
          {entry.children?.map(child => (
            <Link
              key={child.to}
              to={withStore(child.to)}
              onClick={onClose}
              className={cn(
                leafClass(isPathActive(pathname, withStore(child.to))),
                'ps-11 text-[0.8rem]',
              )}
            >
              <span className="truncate">{t(child.labelKey)}</span>
            </Link>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const content = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center justify-center py-4">
        <MSupplyGuy width={48} height={48} />
      </div>
      <div className="border-b" />

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <nav className="space-y-0.5">{UPPER.map(renderEntry)}</nav>
        <div className="my-2 border-b" />
        <nav className="space-y-0.5">
          {LOWER.map(renderEntry)}
          <button
            type="button"
            onClick={() => {
              onClose(); // close the mobile overlay before opening the modal
              onOpenSync();
            }}
            className={leafClass(false)}
          >
            <span className="relative shrink-0">
              <RefreshCwIcon className="size-5" />
              {pushCount > 0 ? (
                <span className="absolute -end-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {pushCount > 999 ? '999+' : pushCount}
                </span>
              ) : null}
            </span>
            <span className="truncate">{t('app.sync')}</span>
          </button>
        </nav>
      </div>

      {/* Footer: account button (user + store switcher + logout), pinned bottom */}
      <div className="border-t p-2">
        <Popover
          open={accountOpen}
          onOpenChange={o => (o ? setAccountOpen(true) : closeAccount())}
        >
          <PopoverTrigger
            className={cn(leafClass(false), 'py-2.5')}
            aria-label={user?.username ?? ''}
          >
            <CircleUserRoundIcon className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 text-start">
              <span className="block truncate font-semibold">
                {user?.username ?? ''}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {store?.name}
              </span>
            </span>
            <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent side="top" align="center" className="w-[224px] p-1">
            {stores.length > 1 ? (
              <>
                <div className="p-1">
                  <Input
                    autoFocus
                    placeholder={t('placeholder.search-stores')}
                    value={storeQuery}
                    onChange={e => setStoreQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredStores.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => switchStore(s.id)}
                      className={leafClass(s.id === store?.id)}
                    >
                      <span className="min-w-0 flex-1 text-start">
                        <span className="block truncate">{s.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {s.code}
                        </span>
                      </span>
                    </button>
                  ))}
                  {filteredStores.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      {t('messages.no-results')}
                    </p>
                  ) : null}
                </div>
                <div className="my-1 border-b" />
              </>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              className={leafClass(false)}
            >
              <LogOutIcon className="size-5 shrink-0" />
              <span>{t('button.logout')}</span>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: temporary overlay, toggled by the floating menu button. */}
      <Sheet open={mobileOpen} onOpenChange={o => (o ? undefined : onClose())}>
        <SheetContent
          side="left"
          className="w-[240px] p-0 md:hidden"
          aria-describedby={undefined}
        >
          {content}
        </SheetContent>
      </Sheet>

      {/* Desktop: permanent sidebar that reserves layout width. */}
      <aside className="hidden w-[240px] shrink-0 border-e bg-drawer md:block">
        {content}
      </aside>
    </>
  );
}
