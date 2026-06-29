use std::collections::{HashMap, HashSet};

use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{
    CustomFieldOptionRow, CustomFieldOptionRowRepository, RepositoryError, StorageConnectionManager,
};
use service::service_provider::ServiceProvider;

use crate::standard_graphql_error::StandardGraphqlError;

/// Returns the set of custom_field keys visible on a given table — used to
/// pre-filter `NameNode.customFields`. Keyed by `table_name`; one fetch per
/// unique table name per request (typically just `"name"`). Routed through
/// `custom_field_service` so tests can stub the lookup without seeding the DB.
pub struct AllowedCustomFieldKeysByTableLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for AllowedCustomFieldKeysByTableLoader {
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
                .custom_field_service
                .allowed_custom_field_keys_for_table(&service_context.connection, table_name)
                .map_err(StandardGraphqlError::from_repository_error)?;
            result.insert(table_name.clone(), keys);
        }
        Ok(result)
    }
}

/// Groups option rows by their `custom_field_id`. Used by the `options` sub-field
/// on `CustomFieldNode` so a single page of custom_field defs resolves option rows
/// in one query rather than one-per-def.
pub struct CustomFieldOptionsByCustomFieldIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for CustomFieldOptionsByCustomFieldIdLoader {
    type Value = Vec<CustomFieldOptionRow>;
    type Error = RepositoryError;

    async fn load(
        &self,
        custom_field_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = CustomFieldOptionRowRepository::new(&connection);

        let options = repo.find_many_by_custom_field_ids(custom_field_ids)?;

        let mut result: HashMap<String, Self::Value> = HashMap::new();
        for option in options {
            result.entry(option.custom_field_id.clone()).or_default().push(option);
        }
        Ok(result)
    }
}
