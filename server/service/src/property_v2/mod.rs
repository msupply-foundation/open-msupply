use std::collections::HashSet;

use repository::{
    PropertyV2, PropertyV2Filter, PropertyV2Repository, RepositoryError, StorageConnection,
};

use crate::{service_provider::ServiceContext, usize_to_u32, ListError, ListResult};

pub trait PropertyV2ServiceTrait: Sync + Send {
    fn get_properties_v2(
        &self,
        ctx: &ServiceContext,
        filter: Option<PropertyV2Filter>,
    ) -> Result<ListResult<PropertyV2>, ListError> {
        get_properties_v2(&ctx.connection, filter)
    }

    fn allowed_property_keys_for_table(
        &self,
        connection: &StorageConnection,
        table_name: &str,
    ) -> Result<HashSet<String>, RepositoryError> {
        PropertyV2Repository::new(connection).allowed_keys_for_table(table_name)
    }
}

pub struct PropertyV2Service;
impl PropertyV2ServiceTrait for PropertyV2Service {}

fn get_properties_v2(
    connection: &StorageConnection,
    filter: Option<PropertyV2Filter>,
) -> Result<ListResult<PropertyV2>, ListError> {
    let rows = PropertyV2Repository::new(connection).query(filter)?;
    Ok(ListResult {
        count: usize_to_u32(rows.len()),
        rows,
    })
}
