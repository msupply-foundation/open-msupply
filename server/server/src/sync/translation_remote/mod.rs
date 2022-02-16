use log::{info, warn};
use repository::{
    schema::{NumberRow, RemoteSyncBufferRow},
    NumberRowRepository, RepositoryError, StorageConnection, TransactionError,
};

use crate::sync::translation_remote::number::LegacyNumberRow;

use super::translation_central::{SyncImportError, SyncTranslationError};

mod number;
mod test_data;

#[derive(Debug)]
pub enum IntegrationUpsertRecord {
    Number(NumberRow),
}

#[derive(Debug)]
struct IntegrationRecord {
    pub upserts: Vec<IntegrationUpsertRecord>,
}

pub const TRANSLATION_RECORD_NUMBER: &str = "number";

/// Returns a list of records that can be translated. The list is topologically sorted, i.e. items
/// at the beginning of the list don't rely on later items to be translated first.
pub const REMOTE_TRANSLATION_RECORDS: &[&str] = &[TRANSLATION_RECORD_NUMBER];

/// Imports sync records and writes them to the DB
/// If needed data records are translated to the local DB schema.
pub async fn import_sync_records(
    connection: &StorageConnection,
    records: &Vec<RemoteSyncBufferRow>,
) -> Result<(), SyncImportError> {
    let mut integration_records = IntegrationRecord {
        upserts: Vec::new(),
    };

    info!(
        "Translating {} remote sync buffer records...",
        records.len()
    );
    for record in records {
        do_translation(&record, &mut integration_records)?;
    }
    info!("Succesfully translated remote sync buffer records");

    info!("Storing integration remote records...");
    store_integration_records(connection, &integration_records).await?;
    info!("Successfully stored integration remote records");

    Ok(())
}

fn do_translation(
    sync_record: &RemoteSyncBufferRow,
    records: &mut IntegrationRecord,
) -> Result<(), SyncTranslationError> {
    use IntegrationUpsertRecord::*;
    if let Some(row) = LegacyNumberRow::try_translate_pull(sync_record)? {
        records.upserts.push(Number(row));
        return Ok(());
    }

    Ok(())
}

fn integrate_record(
    record: &IntegrationUpsertRecord,
    con: &StorageConnection,
) -> Result<(), RepositoryError> {
    match &record {
        IntegrationUpsertRecord::Number(record) => NumberRowRepository::new(con).upsert_one(record),
    }
}

async fn store_integration_records(
    connection: &StorageConnection,
    integration_records: &IntegrationRecord,
) -> Result<(), SyncImportError> {
    connection
        .transaction(|con| async move {
            for record in &integration_records.upserts {
                // Integrate every record in a sub transaction. This is mainly for Postgres where the
                // whole transaction fails when there is a DB error (not a problem in sqlite).
                let sub_result =
                    con.transaction_sync_etc(|sub_tx| integrate_record(record, sub_tx), false);
                match sub_result {
                    Ok(_) => Ok(()),
                    Err(TransactionError::Inner(err @ RepositoryError::ForeignKeyViolation(_))) => {
                        warn!("Failed to import ({}): {:?}", err, record);
                        Ok(())
                    }
                    Err(err) => Err(SyncImportError::as_integration_error(
                        RepositoryError::from(err),
                        "",
                    )),
                }?;
            }
            Ok(())
        })
        .await
        .map_err(|error| match error {
            TransactionError::Transaction { msg, level } => SyncImportError::as_integration_error(
                RepositoryError::TransactionError { msg, level },
                "",
            ),
            TransactionError::Inner(e) => e,
        })
}
