import gql from 'graphql-tag';
import {
  FullSyncStatusFragmentDoc,
} from './operations.generated';

export const SyncStatusUpdatedDocument = gql`
  subscription syncStatusUpdated {
    syncStatusUpdated {
      ...FullSyncStatus
    }
  }
  ${FullSyncStatusFragmentDoc}
`;
