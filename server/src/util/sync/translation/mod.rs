mod item;
mod name;

use crate::{
    database::repository::{
        repository::IntegrationUpsertRecord, IntegrationRecord, SyncRepository,
    },
    server::data::RepositoryRegistry,
};

use self::{item::LegacyItemRow, name::LegacyNameTable};

#[derive(Debug)]
pub enum SyncType {
    Delete,
    Update,
    Insert,
}

#[derive(Debug)]
pub struct SyncRecord {
    sync_type: SyncType,
    record_type: String,
    data: String,
}

/// Translates sync records into the local DB schema.
/// Translated records are added to integration_records.
fn do_translation(
    sync_record: &SyncRecord,
    integration_records: &mut IntegrationRecord,
) -> Result<(), String> {
    if let Some(row) = LegacyNameTable::try_translate(sync_record)? {
        integration_records
            .upserts
            .push(IntegrationUpsertRecord::Name(row));

        return Ok(());
    }
    if let Some(row) = LegacyItemRow::try_translate(sync_record)? {
        integration_records
            .upserts
            .push(IntegrationUpsertRecord::Item(row));

        return Ok(());
    }

    Err("Cannot find matching translation".to_string())
}

/// Imports sync records and writes them to the DB
/// If needed data records are translated to the local DB schema.
pub async fn import_sync_records(
    registry: &RepositoryRegistry,
    records: &Vec<SyncRecord>,
) -> Result<(), String> {
    let mut integration_records = IntegrationRecord {
        upserts: Vec::new(),
    };
    for record in records {
        do_translation(&record, &mut integration_records)?;
    }

    let sync_repo = registry.get::<SyncRepository>();
    sync_repo
        .integrate_records(&integration_records)
        .await
        .map_err(|e| format!("Sync Error: {}", e))?;
    Ok(())
}
