use std::{cmp::Ordering, collections::HashMap};

use repository::{
    syncv7::{translators, Upsert},
    ChangelogTableName, RepositoryError, StorageConnection, SyncBufferV7Row,
};

pub(crate) fn integrate(
    connection: &StorageConnection,
    sync_buffer_row: &SyncBufferV7Row,
    upsert: Box<dyn Upsert>,
) -> Result<(), RepositoryError> {
    upsert.upsert_sync(
        connection,
        sync_buffer_row.source_site_id,
        Some(sync_buffer_row.clone().to_changelog_extra()),
    )
}
