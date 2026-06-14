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
import LogoutIcon from '@mui/icons-material/Logout';
import {
  Box,
  Collapse,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useSession } from '@/app/session';
import { useTranslation, type TxKey } from '@/intl';
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

function isEntryActive(pathname: string, entry: NavEntry): boolean {
  if (entry.to) return isPathActive(pathname, entry.to, entry.exact);
  return (entry.children ?? []).some(c => isPathActive(pathname, c.to));
}

interface NavDrawerProps {
  /** Controls the temporary (mobile) drawer; ignored by the permanent one. */
  mobileOpen: boolean;
  onClose: () => void;
}

const paperSx = { width: DRAWER_WIDTH, boxSizing: 'border-box' } as const;

export function NavDrawer({ mobileOpen, onClose }: NavDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const store = useSession(s => s.store);
  const clear = useSession(s => s.clear);
  const pathname = useRouterState({ select: s => s.location.pathname });

  // User-toggled expansion overrides; otherwise a section auto-expands when it
  // contains the active route.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isExpanded = (entry: NavEntry) =>
    overrides[entry.id] ?? isEntryActive(pathname, entry);
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
          to={entry.to}
          selected={isEntryActive(pathname, entry)}
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
                to={child.to}
                selected={isPathActive(pathname, child.to)}
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
        <List>{LOWER.map(renderEntry)}</List>
      </Box>

      {/* Footer: store + logout, pinned to the bottom */}
      <Divider />
      {store ? (
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {t('label.store')}
          </Typography>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {store.name}
          </Typography>
        </Box>
      ) : null}
      <List disablePadding>
        <ListItemButton onClick={onLogout}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary={t('button.logout')} />
        </ListItemButton>
      </List>
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
