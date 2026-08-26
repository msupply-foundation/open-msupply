import { lazy, Show } from 'solid-js';
import { Navigate, Route, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { isCentralServer } from '../../api/serverInfo';
import { hasPermission } from '../../store/storeContext';

// Help vertical routes (spec/help). S1 (the Help page) at the sidebar's Help
// entry — universal, every signed-in user. The central-only help-document
// management screen (S2/S3) lives under the Manage nav group at
// 'manage/help-documents' and is registered separately (central-gated).
const HelpPage = lazy(() => import('./HelpPage'));
const HelpDocumentsManagement = lazy(() => import('./HelpDocumentsManagement'));

export const helpRoutes = () => <Route path="/" component={HelpPage} />;

// Central-server + server-admin gate (spec/help S2, OMS-REG-HLP-01.28),
// mirroring patients' DispensaryOnly: the nav entry is hidden elsewhere
// (ShellLayout), and this layout route blocks direct-URL entry so the screen is
// unreachable either way. It renders under StoreGuardLayout, which withholds
// its children until the store context has loaded, so the permission is settled
// here — a non-central or non-admin session redirects to the store dashboard
// rather than briefly exposing the screen (whose mutations the server rejects
// regardless).
const CentralAdminOnly = (props: RouteSectionProps) => {
  const params = useParams<{ storeId: string }>();
  return (
    <Show
      when={isCentralServer() && hasPermission('SERVER_ADMIN')}
      fallback={<Navigate href={`/${params.storeId}`} />}
    >
      {props.children}
    </Show>
  );
};

export const helpDocumentsRoutes = () => (
  <Route path="/" component={CentralAdminOnly}>
    <Route path="/" component={HelpDocumentsManagement} />
  </Route>
);
