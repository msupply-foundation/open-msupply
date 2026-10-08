import { t } from '../intl';
import type { LocaleKey } from '../intl';

// Human-readable label for a server permission name.
//
// The name comes from a Forbidden error's `extensions.details`
// (kdd wire trap): the internal PascalCase name, e.g. "StocktakeMutate" — NOT
// the permissions query's SCREAMING_CASE ("STOCKTAKE_MUTATE"). We look up a
// `permission.<PascalName>` catalog entry and, when there isn't one (a
// permission we haven't labelled, or a future server addition), fall back to
// the raw name so the modal still says *something* specific rather than
// swallowing it.
//
// `t()` returns the key itself on a miss, so an unchanged return means "no
// label" → use the raw name. The cast is the one place we build a LocaleKey
// dynamically; unknown names are handled by the fallback, so it can't surface a
// raw `permission.*` key to the user.
export const humanisePermission = (name: string): string => {
  const key = `permission.${name}` as LocaleKey;
  const label = t(key);
  return label === key ? name : label;
};
