use std::{cmp::Ordering, collections::HashMap};

use repository::{
    syncv7::Upsert, ChangelogTableName, RepositoryError, StorageConnection, SyncBufferV7Row,
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

pub(crate) struct RelationsOrder {
    order_map: HashMap<ChangelogTableName, usize>,
}

impl RelationsOrder {
    pub(crate) fn new() -> Self {
        Self {
            order_map: Self::relations_order_map(),
        }
    }

    pub(crate) fn sort(&self, a: &ChangelogTableName, b: &ChangelogTableName) -> Ordering {
        let a_order = self.order_map.get(a).cloned().unwrap_or(usize::MAX);
        let b_order = self.order_map.get(b).cloned().unwrap_or(usize::MAX);
        a_order.cmp(&b_order)
    }

    fn relationship_order() -> Vec<ChangelogTableName> {
        vec![ChangelogTableName::Sensor]
    }

    fn relations_order_map() -> HashMap<ChangelogTableName, usize> {
        Self::relationship_order()
            .into_iter()
            .enumerate()
            .map(|(index, name)| (name, index))
            .collect()
    }
}
