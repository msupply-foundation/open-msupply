// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.
import type { ChangelogTableName } from './ChangelogTableName';
import type { RowActionType } from './RowActionType';

export type ChangelogRow = {
  cursor: bigint;
  table_name: ChangelogTableName;
  record_id: string;
  row_action: RowActionType;
  name_id: string | null;
  store_id: string | null;
  is_sync_update: boolean;
  source_site_id: number | null;
};
