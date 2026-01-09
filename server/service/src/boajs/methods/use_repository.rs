use boa_engine::*;
use repository::{
    DaysOutOfStockFilter, DaysOutOfStockRepository, DaysOutOfStockRow, PluginDataRow,
    PluginDataRowRepository, SyncMessageRow, SyncMessageRowRepository,
};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{boajs::context::BoaJsContext, boajs::utils::*};

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "t", content = "v")]
pub(crate) enum UseRepositoryInput {
    GetSyncMessageById(String),
    UpsertPluginData(PluginDataRow),
    UpsertSyncMessage(SyncMessageRow),
    GetDaysOutOfStock(DaysOutOfStockFilter),
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "t", content = "v")]
pub(crate) enum UseRepositoryOutput {
    GetSyncMessageById(Option<SyncMessageRow>),
    UpsertSyncMessage(i64),
    UpsertPluginData(i64),
    GetDaysOutOfStock(Vec<DaysOutOfStockRow>),
}

pub(crate) fn bind_method(context: &mut Context) -> Result<(), JsError> {
    context.register_global_callable(
        JsString::from("use_repository"),
        0,
        NativeFunction::from_copy_closure(move |_, args, mut ctx| {
            let input: UseRepositoryInput = get_serde_argument(&mut ctx, args, 0)?;

            // When using BoaJsContext, it's best to use 'scope'
            let output: UseRepositoryOutput = {
                let service_provider = BoaJsContext::service_provider();
                let connection = service_provider
                    .connection()
                    .map_err(std_error_to_js_error)?;

                use UseRepositoryInput as In;
                use UseRepositoryOutput as Out;

                match input {
                    In::GetSyncMessageById(id) => Out::GetSyncMessageById(
                        SyncMessageRowRepository::new(&connection)
                            .find_one_by_id(&id)
                            .map_err(std_error_to_js_error)?,
                    ),
                    In::UpsertSyncMessage(message_row) => Out::UpsertSyncMessage(
                        SyncMessageRowRepository::new(&connection)
                            .upsert_one(&message_row)
                            .map_err(std_error_to_js_error)?,
                    ),
                    In::UpsertPluginData(plugin_data_row) => Out::UpsertPluginData(
                        PluginDataRowRepository::new(&connection)
                            .upsert_one(&plugin_data_row)
                            .map_err(std_error_to_js_error)?,
                    ),
                    In::GetDaysOutOfStock(filter) => Out::GetDaysOutOfStock(
                        DaysOutOfStockRepository::new(&connection)
                            .query(filter)
                            .map_err(std_error_to_js_error)?,
                    ),
                }
            };

            let value: serde_json::Value =
                serde_json::to_value(&output).map_err(std_error_to_js_error)?;
            // We return the moved variable as a `JsValue`.
            Ok(JsValue::from_json(&value, ctx)?)
        }),
    )?;
    Ok(())
}
