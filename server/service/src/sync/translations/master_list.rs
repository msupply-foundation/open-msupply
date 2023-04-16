use repository::{
    MasterListRow, NameTagRowRepository, PeriodScheduleRowRepository,
    ProgramRequisitionOrderTypeRow, ProgramRequisitionSettingsRow, ProgramRow, StorageConnection,
    SyncBufferRow,
};

use serde::Deserialize;

use super::{
    IntegrationRecords, LegacyTableName, PullDeleteRecordTable, PullUpsertRecord, SyncTranslation,
};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterRow {
    #[serde(rename = "ID")]
    id: String,
    description: String,
    #[serde(rename = "isProgram")]
    is_program: bool,
    code: String,
    note: String,
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
    tags: std::collections::HashMap<String, LegacyProgramSettingsStoreTag>,
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
    max_order_per_period: f64,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::LIST_MASTER
}
pub(crate) struct MasterListTranslation {}
impl SyncTranslation for MasterListTranslation {
    fn try_translate_pull_upsert(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyListMasterRow>(&sync_record.data)?;

        let master_list = MasterListRow {
            id: data.id.clone(),
            name: data.description.clone(),
            code: data.code.clone(),
            description: data.note.clone(),
        };

        let generate = generate_requisition_program(connection, data)?;
        let (program, program_requisition_settings, program_requisition_order_types) =
            match generate {
                Some(generate) => (
                    generate.program_row,
                    generate.program_requisition_settings_row,
                    generate.program_requisition_order_type_rows,
                ),
                None => {
                    return Ok(Some(IntegrationRecords::from_upsert(
                        PullUpsertRecord::MasterList(master_list),
                    )))
                }
            };

        let mut upserts = Vec::new();

        upserts.push(PullUpsertRecord::MasterList(master_list));
        upserts.push(PullUpsertRecord::Program(program));
        upserts.push(PullUpsertRecord::ProgramRequisitionSettings(
            program_requisition_settings,
        ));

        program_requisition_order_types
            .into_iter()
            .for_each(|program_requisition_order_type| {
                upserts.push(PullUpsertRecord::ProgramRequisitionOrderType(
                    program_requisition_order_type,
                ))
            });

        Ok(Some(IntegrationRecords::from_upserts(upserts)))
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let result = match_pull_table(sync_record).then(|| {
            IntegrationRecords::from_delete(
                &sync_record.record_id,
                PullDeleteRecordTable::MasterList,
            )
        });

        Ok(result)
    }
}

struct GenerateRequisitionProgram {
    pub program_row: ProgramRow,
    pub program_requisition_settings_row: ProgramRequisitionSettingsRow,
    pub program_requisition_order_type_rows: Vec<ProgramRequisitionOrderTypeRow>,
}

fn generate_requisition_program(
    connection: &StorageConnection,
    master_list: LegacyListMasterRow,
) -> Result<Option<GenerateRequisitionProgram>, anyhow::Error> {
    if master_list.is_program == false {
        return Ok(None);
    }

    let program_settings = master_list.program_settings.ok_or(anyhow::anyhow!(
        "Program settings not found for program {}",
        master_list.id
    ))?;
    let order_types = program_settings
        .store_tags
        .tags
        .values()
        .filter_map(|tag| tag.order_types.clone())
        .flatten()
        .collect::<Vec<LegacyOrderType>>();

    let name_tag_and_period_schedule_ids = get_name_tag_and_period_schedule_id(
        connection,
        &program_settings.store_tags,
        &master_list.id.clone(),
    )?;

    let program_row = ProgramRow {
        id: master_list.id.clone(),
        name: master_list.description.clone(),
    };

    let program_requisition_settings_row = ProgramRequisitionSettingsRow {
        // Concatenate the program id and name tag id to create a unique id
        // instead of using uuid since easier to test this way.
        id: format!("{}{}", master_list.id, name_tag_and_period_schedule_ids.0),
        name_tag_id: name_tag_and_period_schedule_ids.0,
        program_id: master_list.id.clone(),
        period_schedule_id: name_tag_and_period_schedule_ids.1,
    };

    let program_requisition_order_type_rows = if !order_types.is_empty() {
        order_types
            .iter()
            .map(|order_type| ProgramRequisitionOrderTypeRow {
                // Concatenate the program requisition setting id and order type id to create a unique id.
                id: format!("{}{}", program_requisition_settings_row.id, order_type.name),
                program_requisition_settings_id: program_requisition_settings_row.id.clone(),
                name: order_type.name.to_string(),
                threshold_mos: order_type.threshold_mos,
                max_mos: order_type.max_mos,
                max_order_per_period: order_type.max_order_per_period,
            })
            .collect::<Vec<ProgramRequisitionOrderTypeRow>>()
    } else {
        Vec::new()
    };

    Ok(Some(GenerateRequisitionProgram {
        program_row,
        program_requisition_settings_row,
        program_requisition_order_type_rows,
    }))
}

fn get_name_tag_and_period_schedule_id(
    connection: &StorageConnection,
    store_tag: &LegacyStoreTagAndProgramName,
    id: &String,
) -> Result<(String, String), anyhow::Error> {
    let name_tag = NameTagRowRepository::new(connection)
        .find_one_by_name(store_tag.tags.keys().next().unwrap())?
        .ok_or(anyhow::anyhow!("Name tag not found for program {}", id))?;

    let period_schedule = PeriodScheduleRowRepository::new(connection)
        .find_one_by_name(&store_tag.tags.values().next().unwrap().period_schedule_name)?
        .ok_or(anyhow::anyhow!(
            "Period schedule not found for program {}",
            id
        ))?;

    Ok((name_tag.id, period_schedule.id))
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_master_list_translation() {
        use crate::sync::test::test_data::master_list as test_data;
        let translator = MasterListTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_master_list_translation",
            MockDataInserts::none().name_tags().period_schedules(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            let translation_result = translator
                .try_translate_pull_delete(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
