import { splitProps, type JSX } from 'solid-js';
import {
  RecordLink as HostRecordLink,
  type RecordLinkProps as HostRecordLinkProps,
} from '../ui/elements/typography/RecordLink';
import { storePath } from '../nav/storeRelativePath';
import { currentStoreId } from '../store/storeContext';

export interface RecordLinkProps extends Omit<HostRecordLinkProps, 'href'> {
  /** A store-relative path — what the deep-link builders return. */
  path: string;
}

// The host's record link over a store path: the router resolves the base
// (navigation.ts).
export const RecordLink = (props: RecordLinkProps): JSX.Element => {
  const [local, rest] = splitProps(props, ['path']);
  const href = () => {
    const storeId = currentStoreId();
    return storeId === undefined ? '/' : storePath(storeId, local.path);
  };
  return <HostRecordLink {...rest} href={href()} />;
};
