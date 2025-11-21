use boa_engine::*;
use chrono::NaiveDate;
use repository::{
    ConsumptionFilter, DateFilter, DaysOutOfStockRepository, DaysOutOfStockRow, EqualFilter,
    SyncMessageRow, SyncMessageRowRepository,
};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{boajs::context::BoaJsContext, boajs::utils::*};

#[derive(Clone, Debug, PartialEq, Default, TS, Serialize, Deserialize)]
pub struct GetDaysOutOfStockFilter {
    #[ts(optional)]
    pub store_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub item_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub from: Option<NaiveDate>,
    #[ts(optional)]
    pub to: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "t", content = "v")]
pub(crate) enum UseRepositoryInput {
    GetSyncMessageById(String),
    UpsertSyncMessage(SyncMessageRow),
    GetDaysOutOfStock(GetDaysOutOfStockFilter),
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "t", content = "v")]
pub(crate) enum UseRepositoryOutput {
    GetSyncMessageById(Option<SyncMessageRow>),
    UpsertSyncMessage(i64),
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
                    In::GetDaysOutOfStock(filter) => {
                        let repo_filter = ConsumptionFilter {
                            item_id: filter.item_id,
                            store_id: filter.store_id,
                            date: Some(DateFilter {
                                equal_to: None,
                                before_or_equal_to: filter.to,
                                after_or_equal_to: filter.from,
                            }),
                        };

                        Out::GetDaysOutOfStock(
                            DaysOutOfStockRepository::new(&connection)
                                .query(Some(repo_filter))
                                .map_err(std_error_to_js_error)?,
                        )
                    }
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
