use repository::{
    EqualFilter, PluginData, PluginDataFilter, PluginDataRepository, PluginDataRow,
    PluginDataRowRepository, RepositoryError,
};

use crate::{service_provider::ServiceContext, sync::CentralServerConfig, WithDBError};

#[derive(Debug, PartialEq)]
pub enum UpdatePluginDataError {
    PluginDataDoesNotExist,
    RelatedRecordDoesNotMatch,
    RelatedRecordTypeDoesNotMatch,
    PluginNameDoesNotMatch,
    DatabaseError(RepositoryError),
    InternalError(String),
}

#[derive(Debug, PartialEq, Clone)]
pub struct UpdatePluginData {
    pub id: String,
    pub store_id: Option<String>,
    pub plugin_code: String,
    pub related_record_id: Option<String>,
    pub data_identifier: String,
    pub data: String,
}

pub fn update(
    ctx: &ServiceContext,
    input: UpdatePluginData,
) -> Result<PluginData, UpdatePluginDataError> {
    ctx.connection
        .transaction_sync(|connection| {
            let existing_row = validate(ctx, &input)?;
            let data = generate(input.clone(), existing_row)?;

            PluginDataRowRepository::new(connection)
                .upsert_one(&data)
                .map_err(UpdatePluginDataError::DatabaseError)
        })
        .map_err(|error| error.to_inner_error())?;

    let plugin_data = PluginDataRepository::new(&ctx.connection)
        .query_by_filter(PluginDataFilter::new().id(EqualFilter::equal_to(&input.id)))?
        .pop()
        .ok_or(UpdatePluginDataError::PluginDataDoesNotExist)?;
    Ok(plugin_data)
}

fn validate(
    ctx: &ServiceContext,
    input: &UpdatePluginData,
) -> Result<PluginDataRow, UpdatePluginDataError> {
    let plugin_data = check_plugin_data_exists(ctx, &input.id)?
        .ok_or(UpdatePluginDataError::PluginDataDoesNotExist)?;

    if input.related_record_id != plugin_data.related_record_id {
        return Err(UpdatePluginDataError::RelatedRecordDoesNotMatch);
    }
    if input.data_identifier != plugin_data.data_identifier {
        return Err(UpdatePluginDataError::RelatedRecordTypeDoesNotMatch);
    }
    if input.plugin_code != plugin_data.plugin_code {
        return Err(UpdatePluginDataError::PluginNameDoesNotMatch);
    }

    if plugin_data.store_id.is_none() && !CentralServerConfig::is_central_server() {
        return Err(UpdatePluginDataError::InternalError(
            "Central Data can only be modified from Central Server".to_string(),
        ));
    }

    Ok(plugin_data)
}

fn check_plugin_data_exists(
    ctx: &ServiceContext,
    id: &str,
) -> Result<Option<PluginDataRow>, UpdatePluginDataError> {
    let plugin_data = PluginDataRowRepository::new(&ctx.connection).find_one_by_id(id);

    match plugin_data {
        Ok(plugin_data) => Ok(plugin_data),
        Err(RepositoryError::NotFound) => Ok(None),
        Err(error) => Err(UpdatePluginDataError::DatabaseError(error)),
    }
}

fn generate(
    UpdatePluginData {
        id,
        plugin_code: _,
        related_record_id: _,
        data_identifier: _,
        data,
        store_id: _,
    }: UpdatePluginData,
    existing: PluginDataRow,
) -> Result<PluginDataRow, RepositoryError> {
    Ok(PluginDataRow {
        id,
        data,
        ..existing
    })
}

impl From<RepositoryError> for UpdatePluginDataError {
    fn from(error: RepositoryError) -> Self {
        UpdatePluginDataError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdatePluginDataError
where
    ERR: Into<UpdatePluginDataError>,
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
        PluginDataRow,
    };
    use util::{inline_edit, inline_init};

    use crate::{plugin_data::UpdatePluginData, service_provider::ServiceProvider};

    #[actix_rt::test]
    async fn update_plugin_success() {
        fn plugin_data_donor() -> PluginDataRow {
            PluginDataRow {
                id: "plugin_data".to_string(),
                plugin_code: "plugin_code".to_string(),
                related_record_id: Some("related_record_id".to_string()),
                data_identifier: "StockLine".to_string(),
                store_id: Some(mock_store_a().id.clone()),
                data: "test".to_string(),
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_plugin_data_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.plugin_data = vec![plugin_data_donor()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.plugin_data_service;

        // Success
        service
            .update(
                &context,
                UpdatePluginData {
                    id: "plugin_data".to_string(),
                    store_id: Some(mock_store_a().id.clone()),
                    plugin_code: "plugin_code".to_string(),
                    related_record_id: Some("related_record_id".to_string()),
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
        let donor = plugin_data_donor();

        assert_eq!(
            plugin_data,
            inline_edit(&donor, |mut u| {
                u.data = "hogwarts".to_string();
                u
            })
        );
    }
}
