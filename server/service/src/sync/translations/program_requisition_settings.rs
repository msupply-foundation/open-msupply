use repository::{
    ContextRow, NameTagRowRepository, PeriodScheduleRowRepository, ProgramRequisitionOrderTypeRow,
    ProgramRequisitionOrderTypeRowDelete, ProgramRequisitionOrderTypeRowRepository,
    ProgramRequisitionSettingsRow, ProgramRequisitionSettingsRowDelete,
    ProgramRequisitionSettingsRowRepository, ProgramRow, StorageConnection, SyncBufferRow,
};

use serde::Deserialize;
use std::collections::HashMap;

use crate::sync::translations::{
    name_tag::NameTagTranslation, period_schedule::PeriodScheduleTranslation,
};

use super::{
    master_list::MasterListTranslation, IntegrationOperation, PullTranslateResult, SyncTranslation,
};

#[allow(non_snake_case)]
#[derive(Deserialize, Clone)]
pub struct LegacyListMasterRow {
    #[serde(rename = "ID")]
    id: String,
    description: String,
    #[serde(rename = "isProgram")]
    is_program: bool,
    #[serde(rename = "programSettings")]
    program_settings: Option<LegacyProgramSettings>,
    is_immunisation: bool,
}

#[derive(Deserialize, Clone)]
struct LegacyProgramSettings {
    #[serde(rename = "storeTags")]
    store_tags: Option<HashMap<String, LegacyProgramSettingsStoreTag>>,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LegacyProgramSettingsStoreTag {
    order_types: Option<Vec<LegacyOrderType>>,
    period_schedule_name: String,
}

#[derive(Deserialize, Clone)]
struct LegacyOrderType {
    name: String,
    #[serde(rename = "thresholdMOS")]
    threshold_mos: f64,
    #[serde(rename = "maxMOS")]
    max_mos: f64,
    #[serde(rename = "maxOrdersPerPeriod")]
    max_order_per_period: i32,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ProgramRequisitionSettingsTranslation)
}

pub(super) struct ProgramRequisitionSettingsTranslation;
impl SyncTranslation for ProgramRequisitionSettingsTranslation {
    fn table_name(&self) -> &str {
        MasterListTranslation.table_name()
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            NameTagTranslation.table_name(),
            PeriodScheduleTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyListMasterRow>(&sync_record.data)?;

        if !data.is_program {
            return Ok(PullTranslateResult::NotMatched);
        }

        let upserts = generate_requisition_program(connection, data.clone())?;
        let deletes = delete_requisition_program(connection, data)?;

        let mut integration_operations = Vec::new();

        deletes
            .program_requisition_order_type_ids
            .into_iter()
            .for_each(|order_type_id| {
                integration_operations.push(IntegrationOperation::delete(
                    ProgramRequisitionOrderTypeRowDelete(order_type_id),
                ))
            });

        deletes
            .program_requisition_settings_ids
            .into_iter()
            .for_each(|settings_id| {
                integration_operations.push(IntegrationOperation::delete(
                    ProgramRequisitionSettingsRowDelete(settings_id),
                ))
            });

        integration_operations.push(IntegrationOperation::upsert(upserts.context_row));
        integration_operations.push(IntegrationOperation::upsert(upserts.program_row));

        upserts
            .program_requisition_settings_rows
            .into_iter()
            .for_each(|u| integration_operations.push(IntegrationOperation::upsert(u)));

        upserts
            .program_requisition_order_type_rows
            .into_iter()
            .for_each(|u| integration_operations.push(IntegrationOperation::upsert(u)));

        Ok(PullTranslateResult::IntegrationOperations(
            integration_operations,
        ))
    }
}

#[derive(Clone)]
struct DeleteRequisitionProgram {
    pub program_requisition_settings_ids: Vec<String>,
    pub program_requisition_order_type_ids: Vec<String>,
}

fn delete_requisition_program(
    connection: &StorageConnection,
    master_list: LegacyListMasterRow,
) -> Result<DeleteRequisitionProgram, anyhow::Error> {
    let mut program_requisition_settings_ids = Vec::new();
    let mut program_requisition_order_type_ids = Vec::new();

    ProgramRequisitionSettingsRowRepository::new(connection)
        .find_many_by_program_id(&master_list.id)?
        .iter()
        .for_each(|program_requisition_setting| {
            program_requisition_settings_ids.push(program_requisition_setting.id.clone())
        });

    ProgramRequisitionOrderTypeRowRepository::new(connection)
        .find_many_by_program_requisition_settings_ids(&program_requisition_settings_ids)?
        .iter()
        .for_each(|order_type| program_requisition_order_type_ids.push(order_type.id.clone()));

    Ok(DeleteRequisitionProgram {
        program_requisition_settings_ids,
        program_requisition_order_type_ids,
    })
}

#[derive(Clone)]
struct GenerateRequisitionProgram {
    pub context_row: ContextRow,
    pub program_row: ProgramRow,
    pub program_requisition_settings_rows: Vec<ProgramRequisitionSettingsRow>,
    pub program_requisition_order_type_rows: Vec<ProgramRequisitionOrderTypeRow>,
}

fn generate_requisition_program(
    connection: &StorageConnection,
    master_list: LegacyListMasterRow,
) -> Result<GenerateRequisitionProgram, anyhow::Error> {
    let program_settings = master_list.program_settings.clone().ok_or(anyhow::anyhow!(
        "Program settings not found for program {}",
        master_list.id
    ))?;

    let context_row = ContextRow {
        id: master_list.id.clone(),
        name: master_list.description.clone(),
    };
    let program_row = ProgramRow {
        id: master_list.id.clone(),
        master_list_id: Some(master_list.id.clone()),
        name: master_list.description.clone(),
        context_id: context_row.id.clone(),
        is_immunisation: master_list.is_immunisation,
    };

    let mut program_requisition_settings_rows = Vec::new();
    let mut program_requisition_order_type_rows = Vec::new();

    if let Some(tags) = program_settings.store_tags {
        for (tag, settings) in tags {
            let name_tag = NameTagRowRepository::new(connection)
                .find_one_by_name(&tag)?
                .ok_or(anyhow::anyhow!(
                    "Name tag not found for program {}",
                    master_list.id
                ))?;

            let period_schedule = PeriodScheduleRowRepository::new(connection)
                .find_one_by_name(&settings.period_schedule_name)?
                .ok_or(anyhow::anyhow!(
                    "Period schedule not found for program {}",
                    master_list.id
                ))?;

            let program_requisition_settings_row = ProgramRequisitionSettingsRow {
                // Concatenate the program id and name tag id to create a unique id
                // instead of using uuid since easier to test this way.
                id: format!("{}{}", master_list.id, name_tag.id.clone()),
                name_tag_id: name_tag.id.clone(),
                program_id: master_list.id.clone(),
                period_schedule_id: period_schedule.id.clone(),
            };

            program_requisition_settings_rows.push(program_requisition_settings_row.clone());

            if let Some(order_types) = settings.order_types {
                for order_type in order_types {
                    let program_requisition_order_type_row = ProgramRequisitionOrderTypeRow {
                        // Concatenate the program requisition setting id and order type name to create a unique id.
                        id: format!(
                            "{}{}",
                            program_requisition_settings_row.id.clone(),
                            order_type.name
                        ),
                        program_requisition_settings_id: program_requisition_settings_row
                            .id
                            .clone(),
                        name: order_type.name.to_string(),
                        threshold_mos: order_type.threshold_mos,
                        max_mos: order_type.max_mos,
                        max_order_per_period: order_type.max_order_per_period,
                    };

                    program_requisition_order_type_rows.push(program_requisition_order_type_row);
                }
            }
        }
    }

    Ok(GenerateRequisitionProgram {
        context_row,
        program_row,
        program_requisition_settings_rows,
        program_requisition_order_type_rows,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_program_requisition_translation() {
        use crate::sync::test::test_data::program_requisition_settings as test_data;
        let translator = ProgramRequisitionSettingsTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_program_requisition_translation",
            MockDataInserts::none().name_tags().period_schedules(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(
                sort_results(translation_result),
                sort_results(record.translated_record)
            );
        }
    }

    // Since storeTags in programSettings is an a json object, order is not guaranteed
    // and sometimes different order of integraiton records will be returned by translator
    // thus we need to sort by type and by id, this is quite easily done just by sorting by
    // debug output
    fn sort_results(unsorted: PullTranslateResult) -> PullTranslateResult {
        let mut to_be_sorted = match unsorted {
            PullTranslateResult::IntegrationOperations(u) => u,
            PullTranslateResult::Ignored(i) => return PullTranslateResult::Ignored(i),
            PullTranslateResult::NotMatched => return PullTranslateResult::NotMatched,
        };

        to_be_sorted.sort_by(|a, b| format!("{a:?}").cmp(&format!("{b:?}")));

        PullTranslateResult::IntegrationOperations(to_be_sorted)
    }
}
