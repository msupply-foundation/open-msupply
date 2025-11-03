use repository::{
    EqualFilter, MasterListRow, MasterListRowDelete, MasterListRowRepository, PluginDataFilter,
    PluginDataRepository, PluginDataRow, PluginDataRowRepository, ProgramRowRepository,
    StorageConnection, SyncBufferRow,
};

use serde::Deserialize;
use util::uuid::uuid;

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterRow {
    #[serde(rename = "ID")]
    id: String,
    description: String,
    code: String,
    note: String,
    inactive: Option<bool>,
    is_default_price_list: Option<bool>,
    discount_percentage: Option<f64>,
    is_essential: Option<bool>,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(MasterListTranslation)
}

pub(super) struct MasterListTranslation;
impl SyncTranslation for MasterListTranslation {
    fn table_name(&self) -> &str {
        "list_master"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyListMasterRow>(&sync_record.data)?;

        // is_essential is only an available value if plugin is active, set via OG
        if data.is_essential.is_some() {
            let filter = PluginDataFilter {
                related_record_id: Some(EqualFilter::equal_to(&data.id.clone())),
                plugin_code: Some(EqualFilter::equal_to(&"congo-plugin".to_string())),
                id: None,
                data_identifier: None,
                store_id: None,
            };

            let existing_plugin_data =
                PluginDataRepository::new(connection).query_by_filter(filter)?;

            let plugin_data = PluginDataRow {
                id: existing_plugin_data
                    .first()
                    .map(|row| row.plugin_data.id.clone())
                    .unwrap_or_else(|| uuid()),
                store_id: None,
                plugin_code: "congo-plugin".to_string(),
                related_record_id: Some(data.id.clone()),
                data_identifier: "master-lists".to_string(),
                data: serde_json::json!({ "is_essential": data.is_essential }).to_string(),
            };

            PluginDataRowRepository::new(connection).upsert_one(&plugin_data)?;
        }

        let result = MasterListRow {
            id: data.id,
            name: data.description,
            code: data.code,
            description: data.note,
            // By default if inactive = null, or missing, it should mean is_active = true
            is_active: !data.inactive.unwrap_or(true),
            is_default_price_list: data.is_default_price_list.unwrap_or(false),
            discount_percentage: data.discount_percentage,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    // Soft deletes were implemented in OG months after program requisitions was
    // rolled out, so previously hard deleted records may be gone even if they
    // are linked to program. Set these records to inactive.
    fn try_translate_from_delete_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let program =
            ProgramRowRepository::new(connection).find_one_by_id(&sync_record.record_id)?;
        let master_list =
            MasterListRowRepository::new(connection).find_one_by_id(&sync_record.record_id)?;

        if let (Some(_), Some(master_list)) = (program, master_list) {
            let result = MasterListRow {
                id: master_list.id,
                name: master_list.name,
                code: master_list.code,
                description: master_list.description,
                is_active: false,
                is_default_price_list: master_list.is_default_price_list,
                discount_percentage: master_list.discount_percentage,
            };
            return Ok(PullTranslateResult::upsert(result));
        }

        Ok(PullTranslateResult::delete(MasterListRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_master_list_translation() {
        use crate::sync::test::test_data::master_list as test_data;
        let translator = MasterListTranslation;

        let (_, connection, _, _) =
            setup_all("test_master_list_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
