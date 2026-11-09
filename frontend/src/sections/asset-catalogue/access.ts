import { isCentralServer } from '@/api/serverInfo';
import { reportPermissionDenied } from '@/api/graphql';
import { hasPermission, type UserPermission } from '@/store/storeContext';

// Who may write the asset catalogue (spec/asset-catalogue › rules § access).
//
// Two gates, treated differently because the user can act on only one of them
// (ui-standards/controls § blocked affordances):
// • the CENTRAL SERVER — nothing on a remote site can make it central, so the
//   write affordances are simply not rendered there (`writesOffered`);
// • the PERMISSIONS — standing state the user holds or not, mirrored at the
//   click: a write without them raises the permission-denied modal and sends
//   nothing (`guard*`). The server enforces both regardless.

/** The permission each write needs, in the store context's spelling and the
 *  PascalCase the permission-denied modal humanises (the wire's
 *  `HasPermission(...)` form). */
type Requirement = { held: UserPermission; wire: string };

const CATALOGUE_ITEM_MUTATE: Requirement = {
  held: 'ASSET_CATALOGUE_ITEM_MUTATE',
  wire: 'AssetCatalogueItemMutate',
};
const ASSET_MUTATE: Requirement = { held: 'ASSET_MUTATE', wire: 'AssetMutate' };
const EDIT_CENTRAL_DATA: Requirement = {
  held: 'EDIT_CENTRAL_DATA',
  wire: 'EditCentralData',
};

/** Adding or deleting catalogue items. */
export const CATALOGUE_WRITE: readonly Requirement[] = [
  CATALOGUE_ITEM_MUTATE,
  EDIT_CENTRAL_DATA,
];
/** Creating or deleting log reasons. */
export const REASON_WRITE: readonly Requirement[] = [
  ASSET_MUTATE,
  EDIT_CENTRAL_DATA,
];

/** The requirements the user lacks, in wire spelling — empty when permitted.
 *  Pure over `holds` so the rule is testable without a store context. */
export const missingFor = (
  required: readonly Requirement[],
  holds: (permission: UserPermission) => boolean
): string[] => required.filter(r => !holds(r.held)).map(r => r.wire);

/** Whether this server offers the vertical's writes at all. */
export const writesOffered = (): boolean => isCentralServer();

/** Mirror a write's permissions at the click: true to proceed; otherwise the
 *  permission-denied modal is raised and the caller sends nothing. */
export const guardWrite = (required: readonly Requirement[]): boolean => {
  const missing = missingFor(required, hasPermission);
  if (missing.length === 0) return true;
  reportPermissionDenied(missing);
  return false;
};
