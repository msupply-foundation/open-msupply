use std::collections::HashMap;

use async_graphql::dataloader::*;
use repository::{PropertyV2ParentTable, RepositoryError, StorageConnectionManager};
use service::property_v2::{
    get_property_v2_values_for_records, PropertyV2ServiceError, PropertyV2ValueWithProperty,
};

// One loader struct per parent table — the anymap-backed loader registry keys
// loaders by concrete type, so a single generic struct would conflict.

pub struct PropertyV2ValuesByNameRecordLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for PropertyV2ValuesByNameRecordLoader {
    type Value = Vec<PropertyV2ValueWithProperty>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        load_for_table(&self.connection_manager, PropertyV2ParentTable::Name, ids)
    }
}

pub struct PropertyV2ValuesByItemRecordLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for PropertyV2ValuesByItemRecordLoader {
    type Value = Vec<PropertyV2ValueWithProperty>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        load_for_table(&self.connection_manager, PropertyV2ParentTable::Item, ids)
    }
}

fn load_for_table(
    connection_manager: &StorageConnectionManager,
    table: PropertyV2ParentTable,
    ids: &[String],
) -> Result<HashMap<String, Vec<PropertyV2ValueWithProperty>>, RepositoryError> {
    get_property_v2_values_for_records(connection_manager, table, ids).map_err(|e| match e {
        PropertyV2ServiceError::DatabaseError(err) => err,
        other => RepositoryError::as_db_error(&format!("{other:?}"), ""),
    })
}
