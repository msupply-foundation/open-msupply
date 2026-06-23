use std::collections::{HashMap, HashSet};

use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{
    PropertyOptionV2Row, PropertyOptionV2RowRepository, PropertyTableV2Row,
    PropertyTableV2RowRepository, RepositoryError, StorageConnectionManager,
};
use service::service_provider::ServiceProvider;

use crate::standard_graphql_error::StandardGraphqlError;

/// Returns the set of property keys visible on a given table — used to
/// pre-filter `NameNode.propertiesV2`. Keyed by `table_name`; one fetch per
/// unique table name per request (typically just `"name"`). Routed through
/// `property_v2_service` so tests can stub the lookup without seeding the DB.
pub struct AllowedPropertyV2KeysByTableLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for AllowedPropertyV2KeysByTableLoader {
    type Value = HashSet<String>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        table_names: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let mut result = HashMap::new();
        for table_name in table_names {
            let keys = self
                .service_provider
                .property_v2_service
                .allowed_property_keys_for_table(&service_context.connection, table_name)
                .map_err(StandardGraphqlError::from_repository_error)?;
            result.insert(table_name.clone(), keys);
        }
        Ok(result)
    }
}

/// Groups option rows by their `property_id`. Used by the `options` sub-field
/// on `PropertyV2Node` so a single page of property defs resolves option rows
/// in one query rather than one-per-def.
pub struct PropertyOptionsV2ByPropertyIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for PropertyOptionsV2ByPropertyIdLoader {
    type Value = Vec<PropertyOptionV2Row>;
    type Error = RepositoryError;

    async fn load(
        &self,
        property_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = PropertyOptionV2RowRepository::new(&connection);

        let options = repo.find_many_by_property_ids(property_ids)?;

        let mut result: HashMap<String, Self::Value> = HashMap::new();
        for option in options {
            result.entry(option.property_id.clone()).or_default().push(option);
        }
        Ok(result)
    }
}

/// Groups `property_table_v2` scope rows by their `property_id`. Backs the
/// `scopes` sub-field on `PropertyV2Node` (the admin "Manage properties" config
/// UI) so a list of N properties resolves their per-scope display modes in a
/// single batched query. Includes `Hidden` scopes — unlike the read-path
/// `propertiesV2(filter: { tableName })` query, the admin needs to see hidden
/// scopes to be able to un-hide them.
pub struct PropertyScopesV2ByPropertyIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for PropertyScopesV2ByPropertyIdLoader {
    type Value = Vec<PropertyTableV2Row>;
    type Error = RepositoryError;

    async fn load(
        &self,
        property_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = PropertyTableV2RowRepository::new(&connection);

        let scopes = repo.find_many_by_property_ids(property_ids)?;

        let mut result: HashMap<String, Self::Value> = HashMap::new();
        for scope in scopes {
            result.entry(scope.property_id.clone()).or_default().push(scope);
        }
        Ok(result)
    }
}
