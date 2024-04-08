use repository::{
    EqualFilter, PluginData, PluginDataFilter, PluginDataRepository, PluginDataRow,
    PluginDataRowRepository, RelatedRecordType, RepositoryError,
};

use crate::{service_provider::ServiceContext, WithDBError};

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
    pub plugin_name: String,
    pub related_record_id: String,
    pub related_record_type: RelatedRecordType,
    pub data: String,
}

pub fn insert(
    ctx: &ServiceContext,
    input: InsertPluginData,
) -> Result<PluginData, InsertPluginDataError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(ctx, &input)?;
            let data = generate(&ctx.store_id, input.clone());

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
    store_id: &str,
    InsertPluginData {
        id,
        plugin_name,
        related_record_id,
        related_record_type,
        data,
    }: InsertPluginData,
) -> PluginDataRow {
    PluginDataRow {
        id,
        plugin_name,
        related_record_id,
        related_record_type,
        store_id: store_id.to_string(),
        data,
    }
}

fn validate(ctx: &ServiceContext, input: &InsertPluginData) -> Result<(), InsertPluginDataError> {
    let plugin_data = PluginDataRowRepository::new(&ctx.connection).find_one_by_id(&input.id)?;

    if plugin_data.is_some() {
        return Err(InsertPluginDataError::PluginDataAlreadyExists);
    };

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
        PluginDataRow, RelatedRecordType,
    };

    use crate::{plugin_data::InsertPluginData, service_provider::ServiceProvider};

    #[actix_rt::test]
    async fn insert_plugin_data_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_plugin_data_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
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
                    plugin_name: "new_plugin_name".to_string(),
                    related_record_id: "new_related_record_id".to_string(),
                    related_record_type: RelatedRecordType::StockLine,
                    data: "hogwarts".to_string(),
                },
            )
            .unwrap();

        let plugin_data = service
            .get_plugin_data(&context, None, None)
            .unwrap()
            .unwrap()
            .plugin_data;

        assert_eq!(
            plugin_data,
            PluginDataRow {
                id: "new_id".to_string(),
                plugin_name: "new_plugin_name".to_string(),
                related_record_id: "new_related_record_id".to_string(),
                related_record_type: RelatedRecordType::StockLine,
                data: "hogwarts".to_string(),
                store_id: mock_store_a().id.to_string(),
            }
        );
    }
}
