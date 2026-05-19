use std::collections::HashMap;

use async_graphql::dataloader::*;
use repository::{PropertyParentTable, RepositoryError, StorageConnectionManager};
use service::property::{
    get_property_values_for_records, PropertyServiceError, PropertyValueWithProperty,
};

// One loader struct per parent table — the anymap-backed loader registry keys
// loaders by concrete type, so a single generic struct would conflict.

pub struct PropertyValuesByNameRecordLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for PropertyValuesByNameRecordLoader {
    type Value = Vec<PropertyValueWithProperty>;
    type Error = RepositoryError;

    async fn load(
        &self,
        ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        load_for_table(&self.connection_manager, PropertyParentTable::Name, ids)
    }
}

pub struct PropertyValuesByItemRecordLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for PropertyValuesByItemRecordLoader {
    type Value = Vec<PropertyValueWithProperty>;
    type Error = RepositoryError;

    async fn load(
        &self,
        ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        load_for_table(&self.connection_manager, PropertyParentTable::Item, ids)
    }
}

fn load_for_table(
    connection_manager: &StorageConnectionManager,
    table: PropertyParentTable,
    ids: &[String],
) -> Result<HashMap<String, Vec<PropertyValueWithProperty>>, RepositoryError> {
    get_property_values_for_records(connection_manager, table, ids).map_err(|e| match e {
        PropertyServiceError::DatabaseError(err) => err,
        other => RepositoryError::as_db_error(&format!("{other:?}"), ""),
    })
}
