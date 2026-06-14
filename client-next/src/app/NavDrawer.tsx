import { useState, type ReactNode } from 'react';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import InputOutlinedIcon from '@mui/icons-material/InputOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalPharmacyOutlinedIcon from '@mui/icons-material/LocalPharmacyOutlined';
import AcUnitOutlinedIcon from '@mui/icons-material/AcUnitOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SyncIcon from '@mui/icons-material/Sync';
import LogoutIcon from '@mui/icons-material/Logout';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import {
  Badge,
  Box,
  Collapse,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  Link,
  useNavigate,
  useParams,
  useRouterState,
} from '@tanstack/react-router';
import { useSession } from '@/app/session';
import { useTranslation, type TxKey } from '@/intl';
import { syncStatusQueryOptions } from '@/features/sync/queries';
import { MSupplyGuy } from '@/components/MSupplyGuy';

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
    icon: <DashboardOutlinedIcon />,
    to: '/',
    exact: true,
  },
  {
    id: 'distribution',
    labelKey: 'app.distribution',
    icon: <LocalShippingOutlinedIcon />,
    children: [
      { to: '/distribution/outbound-shipment', labelKey: 'app.outbound-shipment' },
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
    icon: <InputOutlinedIcon />,
    children: [
      { to: '/replenishment/internal-order', labelKey: 'app.internal-order' },
      { to: '/replenishment/inbound-shipment', labelKey: 'app.inbound-shipment' },
      { to: '/replenishment/supplier-return', labelKey: 'app.supplier-return' },
      { to: '/replenishment/suppliers', labelKey: 'app.suppliers' },
    ],
  },
  {
    id: 'inventory',
    labelKey: 'app.inventory',
    icon: <Inventory2OutlinedIcon />,
    children: [
      { to: '/stock', labelKey: 'app.stock' },
      { to: '/stocktake', labelKey: 'app.stocktakes' },
      { to: '/inventory/locations', labelKey: 'app.locations' },
    ],
  },
  {
    id: 'dispensary',
    labelKey: 'app.dispensary',
    icon: <LocalPharmacyOutlinedIcon />,
    children: [
      { to: '/dispensary/patients', labelKey: 'app.patients' },
      { to: '/dispensary/prescription', labelKey: 'app.prescription' },
      { to: '/dispensary/clinicians', labelKey: 'app.clinicians' },
    ],
  },
  {
    id: 'cold-chain',
    labelKey: 'app.cold-chain',
    icon: <AcUnitOutlinedIcon />,
    children: [
      { to: '/cold-chain/equipment', labelKey: 'app.equipment' },
      { to: '/cold-chain/monitoring', labelKey: 'app.monitoring' },
      { to: '/cold-chain/sensors', labelKey: 'app.sensors' },
    ],
  },
  {
    id: 'catalogue',
    labelKey: 'app.catalogue',
    icon: <MenuBookOutlinedIcon />,
    children: [
      { to: '/catalogue/items', labelKey: 'app.items' },
      { to: '/catalogue/assets', labelKey: 'app.assets' },
      { to: '/catalogue/master-lists', labelKey: 'app.master-lists' },
    ],
  },
  {
    id: 'reports',
    labelKey: 'app.reports',
    icon: <AssessmentOutlinedIcon />,
    to: '/reports',
  },
];

const LOWER: NavEntry[] = [
  {
    id: 'manage',
    labelKey: 'app.manage',
    icon: <TuneOutlinedIcon />,
    children: [
      { to: '/manage/stores', labelKey: 'app.stores' },
      { to: '/manage/campaigns', labelKey: 'app.campaigns' },
      { to: '/manage/global-preferences', labelKey: 'app.global-preferences' },
    ],
  },
  {
    id: 'settings',
    labelKey: 'app.settings',
    icon: <SettingsOutlinedIcon />,
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

const paperSx = { width: DRAWER_WIDTH, boxSizing: 'border-box' } as const;

export function NavDrawer({ mobileOpen, onClose, onOpenSync }: NavDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSession(s => s.user);
  const store = useSession(s => s.store);
  const stores = useSession(s => s.stores);
  const clear = useSession(s => s.clear);

  // Account popover (store switcher + logout), anchored at the bottom button.
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const [storeQuery, setStoreQuery] = useState('');
  const closeAccount = () => {
    setAccountAnchor(null);
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

  const renderEntry = (entry: NavEntry) => {
    // Leaf section (single destination).
    if (entry.to) {
      return (
        <ListItemButton
          key={entry.id}
          component={Link}
          to={withStore(entry.to)}
          selected={isEntryActive(pathname, entry, withStore)}
          onClick={onClose}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>{entry.icon}</ListItemIcon>
          <ListItemText primary={t(entry.labelKey)} />
        </ListItemButton>
      );
    }

    // Parent section with collapsible children.
    const open = isExpanded(entry);
    return (
      <Box key={entry.id}>
        <ListItemButton onClick={() => toggle(entry.id, open)}>
          <ListItemIcon sx={{ minWidth: 40 }}>{entry.icon}</ListItemIcon>
          <ListItemText primary={t(entry.labelKey)} />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List disablePadding>
            {entry.children?.map(child => (
              <ListItemButton
                key={child.to}
                component={Link}
                to={withStore(child.to)}
                selected={isPathActive(pathname, withStore(child.to))}
                onClick={onClose}
                sx={{ pl: 4 }}
              >
                <ListItemText
                  primary={t(child.labelKey)}
                  slotProps={{ primary: { variant: 'body2' } }}
                />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      </Box>
    );
  };

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 2,
        }}
      >
        <MSupplyGuy width={48} height={48} />
      </Box>
      <Divider />

      {/* Scrollable nav */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List>{UPPER.map(renderEntry)}</List>
        <Divider />
        <List>
          {LOWER.map(renderEntry)}
          <ListItemButton
            onClick={() => {
              onClose(); // close the mobile overlay before opening the modal
              onOpenSync();
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Badge
                color="primary"
                max={999}
                badgeContent={syncStatus?.numberOfRecordsInPushQueue ?? 0}
              >
                <SyncIcon />
              </Badge>
            </ListItemIcon>
            <ListItemText primary={t('app.sync')} />
          </ListItemButton>
        </List>
      </Box>

      {/* Footer: account button (user + store switcher + logout), pinned bottom */}
      <Divider />
      <List disablePadding>
        <ListItemButton
          onClick={e => setAccountAnchor(e.currentTarget)}
          sx={{ py: 1.25 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <AccountCircleOutlinedIcon />
          </ListItemIcon>
          <ListItemText
            primary={user?.username ?? ''}
            secondary={store?.name}
            slotProps={{
              primary: { noWrap: true, sx: { fontWeight: 600 } },
              secondary: { noWrap: true },
            }}
          />
          <UnfoldMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        </ListItemButton>
      </List>

      <Popover
        open={Boolean(accountAnchor)}
        anchorEl={accountAnchor}
        onClose={closeAccount}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ paper: { sx: { width: DRAWER_WIDTH - 16 } } }}
      >
        {stores.length > 1 ? (
          <>
            <Box sx={{ p: 1 }}>
              <TextField
                size="small"
                fullWidth
                autoFocus
                placeholder={t('placeholder.search-stores')}
                value={storeQuery}
                onChange={e => setStoreQuery(e.target.value)}
              />
            </Box>
            <List dense disablePadding sx={{ maxHeight: 240, overflowY: 'auto' }}>
              {filteredStores.map(s => (
                <ListItemButton
                  key={s.id}
                  selected={s.id === store?.id}
                  onClick={() => switchStore(s.id)}
                >
                  <ListItemText
                    primary={s.name}
                    secondary={s.code}
                    slotProps={{ primary: { noWrap: true } }}
                  />
                </ListItemButton>
              ))}
              {filteredStores.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ px: 2, py: 1 }}
                >
                  {t('messages.no-results')}
                </Typography>
              ) : null}
            </List>
            <Divider />
          </>
        ) : null}
        <List disablePadding>
          <ListItemButton onClick={onLogout}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary={t('button.logout')} />
          </ListItemButton>
        </List>
      </Popover>
    </Box>
  );

  return (
    <>
      {/* Mobile: temporary overlay, toggled by the floating menu button. */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': paperSx,
        }}
      >
        {content}
      </Drawer>

      {/* Desktop: permanent sidebar that reserves layout width. */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': paperSx,
        }}
      >
        {content}
      </Drawer>
    </>
  );
}
