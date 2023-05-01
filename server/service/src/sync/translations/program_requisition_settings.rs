use repository::{
    NameTagRowRepository, PeriodScheduleRowRepository, ProgramRequisitionOrderTypeRow,
    ProgramRequisitionOrderTypeRowRepository, ProgramRequisitionSettingsRow,
    ProgramRequisitionSettingsRowRepository, ProgramRow, StorageConnection, SyncBufferRow,
};

use serde::Deserialize;
use std::collections::HashMap;

use super::{
    IntegrationRecords, LegacyTableName, PullDeleteRecord, PullDeleteRecordTable, PullUpsertRecord,
    SyncTranslation,
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
}

#[derive(Deserialize, Clone)]
struct LegacyProgramSettings {
    #[serde(rename = "storeTags")]
    store_tags: LegacyStoreTagAndProgramName,
}

#[derive(Deserialize, Clone)]
struct LegacyStoreTagAndProgramName {
    // HashMap key is the program name
    #[serde(flatten)]
    tags: HashMap<String, LegacyProgramSettingsStoreTag>,
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

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::LIST_MASTER
}
pub(crate) struct ProgramRequisitionSettingsTranslation {}
impl SyncTranslation for ProgramRequisitionSettingsTranslation {
    fn try_translate_pull_upsert(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyListMasterRow>(&sync_record.data)?;

        let Some(generate) = generate_requisition_program(connection, data.clone())? else {return Ok(None)};
        let Some(delete) = delete_requisition_program(connection, data)? else {return Ok(None)};

        let mut upserts = Vec::new();
        let mut deletes = Vec::new();

        delete
            .program_requisition_order_type_ids
            .into_iter()
            .for_each(|order_type_id| {
                deletes.push(PullDeleteRecord {
                    id: order_type_id,
                    table: PullDeleteRecordTable::ProgramRequisitionOrderType,
                })
            });

        delete
            .program_requisition_settings_ids
            .into_iter()
            .for_each(|settings_id| {
                deletes.push(PullDeleteRecord {
                    id: settings_id,
                    table: PullDeleteRecordTable::ProgramRequisitionSettings,
                })
            });

        upserts.push(PullUpsertRecord::Program(generate.program_row));

        generate
            .program_requisition_settings_rows
            .into_iter()
            .for_each(|program_requisition_setting| {
                upserts.push(PullUpsertRecord::ProgramRequisitionSettings(
                    program_requisition_setting,
                ))
            });

        generate
            .program_requisition_order_type_rows
            .into_iter()
            .for_each(|program_requisition_order_type| {
                upserts.push(PullUpsertRecord::ProgramRequisitionOrderType(
                    program_requisition_order_type,
                ))
            });

        Ok(Some(IntegrationRecords { upserts, deletes }))
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
) -> Result<Option<DeleteRequisitionProgram>, anyhow::Error> {
    if master_list.is_program == false {
        return Ok(None);
    }

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

    Ok(Some(DeleteRequisitionProgram {
        program_requisition_settings_ids,
        program_requisition_order_type_ids,
    }))
}

#[derive(Clone)]
struct GenerateRequisitionProgram {
    pub program_row: ProgramRow,
    pub program_requisition_settings_rows: Vec<ProgramRequisitionSettingsRow>,
    pub program_requisition_order_type_rows: Vec<ProgramRequisitionOrderTypeRow>,
}

fn generate_requisition_program(
    connection: &StorageConnection,
    master_list: LegacyListMasterRow,
) -> Result<Option<GenerateRequisitionProgram>, anyhow::Error> {
    if master_list.is_program == false {
        return Ok(None);
    }

    let program_settings = master_list.program_settings.clone().ok_or(anyhow::anyhow!(
        "Program settings not found for program {}",
        master_list.id
    ))?;

    let program_row = ProgramRow {
        id: master_list.id.clone(),
        master_list_id: master_list.id.clone(),
        name: master_list.description.clone(),
    };

    let mut program_requisition_settings_rows = Vec::new();
    let mut program_requisition_order_type_rows = Vec::new();

    for (tag, settings) in program_settings.store_tags.tags {
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
                    program_requisition_settings_id: program_requisition_settings_row.id.clone(),
                    name: order_type.name.to_string(),
                    threshold_mos: order_type.threshold_mos,
                    max_mos: order_type.max_mos,
                    max_order_per_period: order_type.max_order_per_period,
                };

                program_requisition_order_type_rows.push(program_requisition_order_type_row);
            }
        }
    }

    Ok(Some(GenerateRequisitionProgram {
        program_row,
        program_requisition_settings_rows,
        program_requisition_order_type_rows,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    fn sort_results(unsorted: Option<IntegrationRecords>) -> Option<IntegrationRecords> {
        unsorted.map(|mut unsorted| {
            use PullUpsertRecord::*;
            unsorted.upserts.sort_by(|a, b| match (a, b) {
                (Program(a), Program(b)) => a.id.cmp(&b.id),
                (Program(_), _) => std::cmp::Ordering::Greater,
                (_, Program(_)) => std::cmp::Ordering::Less,
                (ProgramRequisitionSettings(a), ProgramRequisitionSettings(b)) => a.id.cmp(&b.id),
                (ProgramRequisitionSettings(_), _) => std::cmp::Ordering::Greater,
                (_, ProgramRequisitionSettings(_)) => std::cmp::Ordering::Less,
                (ProgramRequisitionOrderType(a), ProgramRequisitionOrderType(b)) => a.id.cmp(&b.id),
                _ => std::cmp::Ordering::Equal,
            });
            unsorted
        })
    }

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
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(
                sort_results(translation_result),
                sort_results(record.translated_record)
            );
        }
    }
}
