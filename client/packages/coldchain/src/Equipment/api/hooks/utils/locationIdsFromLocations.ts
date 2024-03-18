import { AssetFragment } from '../../operations.generated';

export const locationIds = (input: AssetFragment): string[] | null => {
  return input.locations.nodes
    ? input.locations.nodes.map(location => location.id)
    : null;
};
