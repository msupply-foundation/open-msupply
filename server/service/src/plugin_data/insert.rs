use repository::{
    EqualFilter, PluginData, PluginDataFilter, PluginDataRepository, PluginDataRow,
    PluginDataRowRepository, RepositoryError,
};

use crate::{service_provider::ServiceContext, sync::CentralServerConfig, WithDBError};

#[derive(PartialEq, Debug)]
pub enum InsertPluginDataError {
    PluginDataAlreadyExists,
    NewlyCreatedPluginDataDoesNotExist,
    DatabaseError(RepositoryError),
    InternalError(String),
}

#[derive(Clone, Debug)]
pub struct InsertPluginData {
    pub id: String,
    pub store_id: Option<String>,
    pub plugin_code: String,
    pub related_record_id: Option<String>,
    pub data_identifier: String,
    pub data: String,
}

pub fn insert(
    ctx: &ServiceContext,
    input: InsertPluginData,
) -> Result<PluginData, InsertPluginDataError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(ctx, &input)?;
            let data = generate(input.clone());

            PluginDataRowRepository::new(connection)
                .insert_one(&data)
                .map_err(InsertPluginDataError::DatabaseError)
        })
        .map_err(|error| error.to_inner_error())?;

    let plugin_data = PluginDataRepository::new(&ctx.connection)
        .query_by_filter(PluginDataFilter::new().id(EqualFilter::equal_to(&input.id)))?
        .pop()
        .ok_or(InsertPluginDataError::NewlyCreatedPluginDataDoesNotExist)?;

    Ok(plugin_data)
}

fn generate(
    InsertPluginData {
        id,
        store_id,
        plugin_code,
        related_record_id,
        data_identifier,
        data,
    }: InsertPluginData,
) -> PluginDataRow {
    PluginDataRow {
        id,
        store_id,
        plugin_code,
        related_record_id,
        data_identifier,
        data,
    }
}

fn validate(ctx: &ServiceContext, input: &InsertPluginData) -> Result<(), InsertPluginDataError> {
    let plugin_data = PluginDataRowRepository::new(&ctx.connection).find_one_by_id(&input.id)?;

    if plugin_data.is_some() {
        return Err(InsertPluginDataError::PluginDataAlreadyExists);
    };

    if input.store_id.is_none() && !CentralServerConfig::is_central_server() {
        return Err(InsertPluginDataError::InternalError(
            "Store ID is required unless on Central Server".to_string(),
        ));
    }

    if let Some(store_id) = &input.store_id {
        if &ctx.store_id != store_id {
            return Err(InsertPluginDataError::InternalError(
                "Store ID doesn't match logged in store_id".to_string(),
            ));
        }
    }

    Ok(())
}

impl From<RepositoryError> for InsertPluginDataError {
    fn from(error: RepositoryError) -> Self {
        InsertPluginDataError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertPluginDataError
where
    ERR: Into<InsertPluginDataError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_store_a, mock_user_account_a, MockDataInserts},
        test_db::setup_all,
        PluginDataRow,
    };

    use crate::{plugin_data::InsertPluginData, service_provider::ServiceProvider};

    #[actix_rt::test]
    async fn insert_plugin_data_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_plugin_data_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.plugin_data_service;

        // Success
        service
            .insert(
                &context,
                InsertPluginData {
                    id: "new_id".to_string(),
                    store_id: Some(mock_store_a().id.to_string()),
                    plugin_code: "test_plugin".to_string(),
                    related_record_id: Some("new_related_record_id".to_string()),
                    data_identifier: "StockLine".to_string(),
                    data: "hogwarts".to_string(),
                },
            )
            .unwrap();

        let plugin_data = service
            .get_plugin_data(&context, None, None)
            .unwrap()
            .rows
            .pop()
            .unwrap()
            .plugin_data;

        assert_eq!(
            plugin_data,
            PluginDataRow {
                id: "new_id".to_string(),
                plugin_code: "test_plugin".to_string(),
                related_record_id: Some("new_related_record_id".to_string()),
                data_identifier: "StockLine".to_string(),
                data: "hogwarts".to_string(),
                store_id: Some(mock_store_a().id.to_string()),
            }
        );
    }
}
