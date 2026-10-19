use chrono::Utc;
use repository::{
    CustomFieldOptionRow, CustomFieldOptionRowRepository, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::CentralServerConfig;
use crate::sync::central_mapping_custom_fields::keys;

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyPurchaseOrderCategoryRow {
    ID: String,
    #[serde(rename = "Description")]
    description: String,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(PurchaseOrderCategoryTranslation)
}

/// Purchase order categories as custom field options, authored on central only.
pub(super) struct PurchaseOrderCategoryTranslation;
impl SyncTranslation for PurchaseOrderCategoryTranslation {
    fn table_names(&self) -> Vec<&str> {
        vec!["purchase_order_category"]
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        _fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        if !CentralServerConfig::is_central_server() {
            return Ok(PullTranslateResult::Ignored(
                "Purchase order category options are authored on central only".to_string(),
            ));
        }

        let data = sync_record.deserialize::<LegacyPurchaseOrderCategoryRow>()?;
        Ok(PullTranslateResult::upsert(CustomFieldOptionRow {
            id: data.ID.clone(),
            custom_field_id: keys::PURCHASE_ORDER_CATEGORY.to_string(),
            key: data.ID,
            name: data.description,
            parent_option_id: None,
            deleted_datetime: None,
            sort_order: String::new(),
        }))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        if !CentralServerConfig::is_central_server() {
            return Ok(PullTranslateResult::Ignored(
                "Purchase order category options are authored on central only".to_string(),
            ));
        }

        let Some(option) = CustomFieldOptionRowRepository::new(connection)
            .find_one_by_id(&sync_record.record_id)?
        else {
            return Ok(PullTranslateResult::Ignored(
                "No matching purchase order category option".to_string(),
            ));
        };

        Ok(PullTranslateResult::upsert(CustomFieldOptionRow {
            deleted_datetime: Some(Utc::now().naive_utc()),
            ..option
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::test_util_set_is_central_server;
    use repository::{SyncAction, SyncRecordData, mock::MockDataInserts, test_db::setup_all};

    fn sync_record() -> SyncBufferRow {
        SyncBufferRow {
            table_name: "purchase_order_category".to_string(),
            record_id: "PO_CAT_1".to_string(),
            data: SyncRecordData(serde_json::json!({
                "ID": "PO_CAT_1",
                "Description": "Emergency",
                "user_1": "",
                "user_2": "",
                "user_3": 0,
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn test_purchase_order_category_translation() {
        let (_, connection, _, _) = setup_all(
            "test_purchase_order_category_translation",
            MockDataInserts::none(),
        )
        .await;
        let translator = PurchaseOrderCategoryTranslation;

        test_util_set_is_central_server(true);
        let on_central = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &crate::sync::translations::FkChecker::new(),
                &sync_record(),
            )
            .unwrap();
        test_util_set_is_central_server(false);
        assert_eq!(
            on_central,
            PullTranslateResult::upsert(CustomFieldOptionRow {
                id: "PO_CAT_1".to_string(),
                custom_field_id: "purchase_order_category".to_string(),
                key: "PO_CAT_1".to_string(),
                name: "Emergency".to_string(),
                parent_option_id: None,
                deleted_datetime: None,
                sort_order: String::new(),
            })
        );

        let on_remote = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &crate::sync::translations::FkChecker::new(),
                &sync_record(),
            )
            .unwrap();
        assert!(matches!(on_remote, PullTranslateResult::Ignored(_)));
    }
}
