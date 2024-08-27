import React, { FC } from 'react';
import {
  useNavigate,
  RouteBuilder,
  useDrawer,
  styled,
  useMatches,
  alpha,
  useTranslation,
  KBarAnimator,
  KBarResults,
  KBarSearch,
  KBarProvider,
  KBarPositioner,
  KBarPortal,
  PropsWithChildrenOnly,
  useAuthContext,
  UserPermission,
  StoreModeNodeType,
  useRegisterActions,
  useConfirmationModal,
  useDetailPanelStore,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Action } from 'kbar/lib/types';
import { useEasterEggModal } from './components/EasterEggModal';

const CustomKBarSearch = styled(KBarSearch)(({ theme }) => ({
  width: 500,
  height: 50,
  fontSize: 20,
  backgroundColor: alpha(theme.palette.primary.main, 0.2),
  borderColor: theme.palette.primary.main,
  borderRadius: 5,
  ':focus-visible': {
    outline: 'none',
  },
}));

const StyledKBarAnimator = styled(KBarAnimator)(({ theme }) => ({
  boxShadow: '0px 6px 20px rgb(0 0 0 / 20%)',
  backgroundColor: alpha(theme.palette.background.toolbar, 0.9),
  borderRadius: 7,
  '& #kbar-listbox>div': {
    padding: '0 8px',
  },
}));

const StyledKBarResults = styled(KBarResults)({
  width: 500,
  fontSize: 16,
  borderRadius: '5px',
  boxShadow: '0px 6px 20px rgb(0 0 0 / 20%)',
  ':focus-visible': {
    outline: 'none',
  },
});

const CustomKBarResults = () => {
  const { results } = useMatches();
  return (
    <StyledKBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === 'string' ? (
          <div>{item}</div>
        ) : (
          <div
            style={{
              background: active ? '#eee' : 'transparent',
            }}
          >
            {item.name}
          </div>
        )
      }
    />
  );
};

const actionSorter = (a: Action, b: Action) => {
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
};

const Actions = () => {
  const navigate = useNavigate();
  const drawer = useDrawer();
  const t = useTranslation('app');
  const { store, logout, user, userHasPermission } = useAuthContext();
  const showEasterEgg = useEasterEggModal();
  const confirmLogout = useConfirmationModal({
    onConfirm: () => {
      logout();
      navigate(RouteBuilder.create(AppRoute.Login).build());
    },
    message: t('messages.logout-confirm'),
    title: t('heading.logout-confirm'),
  });
  const { close, open } = useDetailPanelStore();

  const actions = [
    {
      id: 'navigation-drawer:toggle',
      name: `${t('cmdk.drawer-toggle')} (n)`,
      shortcut: ['n'],
      keywords: 'drawer, close',
      perform: () => drawer.toggle(),
    },
    {
      id: 'navigation-drawer:report',
      name: `${t('cmdk.goto-reports')} (g+r)`,
      shortcut: ['g', 'r'],
      keywords: 'report',
      perform: () => navigate(RouteBuilder.create(AppRoute.Reports).build()),
    },
    {
      id: 'navigation:outbound-shipment',
      name: `${t('cmdk.goto-outbound')} (o)`,
      shortcut: ['o'],
      keywords: 'shipment',
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.OutboundShipment)
            .build()
        ),
    },
    {
      id: 'navigation:inbound-shipment',
      name: `${t('cmdk.goto-inbound')} (i)`,
      shortcut: ['i'],
      keywords: 'shipment',
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InboundShipment)
            .build()
        ),
    },
    {
      id: 'navigation:customers',
      name: `${t('cmdk.goto-customers')} (g+c)`,
      keywords: 'customers',
      shortcut: ['g', 'c'],
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.Customer)
            .build()
        ),
    },
    {
      id: 'navigation:dashboard',
      name: `${t('cmdk.goto-dashboard')} (d)`,
      shortcut: ['d'],
      keywords: 'dashboard',
      perform: () => navigate(RouteBuilder.create(AppRoute.Dashboard).build()),
    },
    {
      id: 'navigation:items',
      name: `${t('cmdk.goto-items')} (g+i)`,
      shortcut: ['g', 'i'],
      keywords: 'items',
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.Items)
            .build()
        ),
    },
    {
      id: 'navigation:customer-requisition',
      name: `${t('cmdk.goto-customer-requisition')} (c+r)`,
      shortcut: ['c', 'r'],
      keywords: 'distribution',
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.CustomerRequisition)
            .build()
        ),
    },
    {
      id: 'navigation:internal-order',
      name: `${t('cmdk.goto-internal-order')} (g+o)`,
      shortcut: ['g', 'o'],
      keywords: 'replenishment',
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InternalOrder)
            .build()
        ),
    },
    {
      id: 'navigation:suppliers',
      name: `${t('cmdk.goto-suppliers')} (g+s)`,
      keywords: 'suppliers',
      shortcut: ['g', 's'],
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.Suppliers)
            .build()
        ),
    },
    {
      id: 'navigation:stock',
      name: `${t('cmdk.goto-stock')} (s)`,
      shortcut: ['s'],
      keywords: 'stock',
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Stock)
            .build()
        ),
    },
    {
      id: 'navigation:stocktakes',
      name: `${t('cmdk.goto-stocktakes')} (g+t)`,
      shortcut: ['g', 't'],
      keywords: 'stocktakes',
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Stocktakes)
            .build()
        ),
    },
    {
      id: 'navigation:locations',
      name: `${t('cmdk.goto-locations')} (g+l)`,
      shortcut: ['g', 'l'],
      keywords: 'locations',
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Locations)
            .build()
        ),
    },
    {
      id: 'navigation:master-lists',
      name: `${t('cmdk.goto-master-lists')} (g+m)`,
      shortcut: ['g', 'm'],
      keywords: 'master lists',
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.MasterLists)
            .build()
        ),
    },
    {
      id: 'action:logout',
      name: `${t('logout')}`,
      shortcut: ['l', 'o'],
      keywords: 'logout',
      perform: () => confirmLogout({}),
    },
    {
      id: 'action:easter-egg',
      name: `${t('easter-egg')}`,
      shortcut: ['e', 'e'],
      keywords: 'easter egg game',
      perform: showEasterEgg,
    },
  ];

  if (userHasPermission(UserPermission.ServerAdmin)) {
    actions.push({
      id: 'navigation:settings',
      name: `${t('settings')} (a)`,
      shortcut: ['a'],
      keywords: 'settings',
      perform: () => navigate(RouteBuilder.create(AppRoute.Settings).build()),
    });
  }

  if (store?.storeMode === StoreModeNodeType.Dispensary) {
    actions.push({
      id: 'navigation:prescription',
      name: `${t('cmdk.goto-prescriptions')} (p)`,
      keywords: 'prescription',
      shortcut: ['p'],
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Dispensary)
            .addPart(AppRoute.Prescription)
            .build()
        ),
    });
    actions.push({
      id: 'navigation:patients',
      name: `${t('cmdk.goto-patients')} (g+p)`,
      keywords: 'patient',
      shortcut: ['g', 'p'],
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Dispensary)
            .addPart(AppRoute.Patients)
            .build()
        ),
    });

    // if (enabled) {
    actions.push(
      {
        id: 'action:more-open',
        name: `${t('cmdk.more-info-close')} (m+o)`,
        keywords: 'more open',
        shortcut: ['m', 'o'],
        perform: open,
      },
      {
        id: 'action:more-close',
        name: `${t('cmdk.more-info-close')} (m+c)`,
        keywords: 'more close',
        shortcut: ['m', 'c'],
        perform: close,
      }
    );
    // }

    if (store?.preferences.vaccineModule ?? false) {
      actions.push({
        id: 'navigation:coldchain-monitoring',
        name: `${t('cmdk.goto-cold-chain-monitoring')} (c+c)`,
        shortcut: ['c', 'c'],
        keywords: 'cold chain coldchain monitoring',
        perform: () =>
          navigate(
            RouteBuilder.create(AppRoute.Coldchain)
              .addPart(AppRoute.Monitoring)
              .build()
          ),
      });
      actions.push({
        id: 'navigation:coldchain-equipment',
        name: `${t('cmdk.goto-cold-chain-equipment')} (c + e)`,
        shortcut: ['c', 'e'],
        keywords: 'cold chain coldchain equipment',
        perform: () =>
          navigate(
            RouteBuilder.create(AppRoute.Coldchain)
              .addPart(AppRoute.Equipment)
              .build()
          ),
      });
    }
  }

  useRegisterActions(actions.sort(actionSorter), [store, user]);

  return <></>;
};

export const CommandK: FC<PropsWithChildrenOnly> = ({ children }) => {
  const t = useTranslation('app');
  return (
    <KBarProvider actions={[]}>
      <Actions />
      <KBarPortal>
        <KBarPositioner style={{ zIndex: 1001 }}>
          <StyledKBarAnimator>
            <CustomKBarSearch placeholder={t('cmdk.placeholder')} />
            <CustomKBarResults />
          </StyledKBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  );
};
