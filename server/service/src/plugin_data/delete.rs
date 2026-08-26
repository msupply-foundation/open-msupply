use repository::{
    PluginDataRow, PluginDataRowRepository, RepositoryError,
};

use crate::{service_provider::ServiceContext, sync::CentralServerConfig, WithDBError};

#[derive(Debug, PartialEq)]
pub enum DeletePluginDataError {
    PluginDataDoesNotExist,
    DatabaseError(RepositoryError),
    InternalError(String),
}

pub fn delete(ctx: &ServiceContext, id: &str) -> Result<String, DeletePluginDataError> {
    ctx.connection
        .transaction_sync(|connection| {
            let existing = validate(ctx, id)?;

            PluginDataRowRepository::new(connection)
                .delete(id, existing.store_id)
                .map_err(DeletePluginDataError::DatabaseError)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(id.to_string())
}

fn validate(ctx: &ServiceContext, id: &str) -> Result<PluginDataRow, DeletePluginDataError> {
    let plugin_data = PluginDataRowRepository::new(&ctx.connection)
        .find_one_by_id(id)?
        .ok_or(DeletePluginDataError::PluginDataDoesNotExist)?;

    // Match update.rs's rule: global rows (store_id = NULL) are central-only.
    if plugin_data.store_id.is_none() && !CentralServerConfig::is_central_server() {
        return Err(DeletePluginDataError::InternalError(
            "Central Data can only be modified from Central Server".to_string(),
        ));
    }

    if let Some(store_id) = &plugin_data.store_id {
        if &ctx.store_id != store_id {
            return Err(DeletePluginDataError::InternalError(
                "Store ID doesn't match logged in store_id".to_string(),
            ));
        }
    }

    Ok(plugin_data)
}

impl From<RepositoryError> for DeletePluginDataError {
    fn from(error: RepositoryError) -> Self {
        DeletePluginDataError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeletePluginDataError
where
    ERR: Into<DeletePluginDataError>,
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
        mock::{mock_store_a, mock_user_account_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        PluginDataRow, PluginDataRowRepository,
    };

    use crate::{plugin_data::DeletePluginDataError, service_provider::ServiceProvider};

    #[actix_rt::test]
    async fn delete_plugin_data_success() {
        fn plugin_data_donor() -> PluginDataRow {
            PluginDataRow {
                id: "plugin_data_to_delete".to_string(),
                plugin_code: "plugin_code".to_string(),
                related_record_id: Some("related_record_id".to_string()),
                data_identifier: "StockLine".to_string(),
                store_id: Some(mock_store_a().id.clone()),
                data: "test".to_string(),
                datetime: None,
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "delete_plugin_data_success",
            MockDataInserts::all(),
            MockData {
                plugin_data: vec![plugin_data_donor()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.plugin_data_service;

        // Not found
        assert_eq!(
            service.delete(&context, "missing"),
            Err(DeletePluginDataError::PluginDataDoesNotExist)
        );

        // Success
        service
            .delete(&context, "plugin_data_to_delete")
            .expect("delete should succeed");

        let after = PluginDataRowRepository::new(&connection)
            .find_one_by_id("plugin_data_to_delete")
            .unwrap();
        assert!(after.is_none(), "row should be gone after delete");
    }
}
