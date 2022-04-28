use log::{info, warn};
use repository::{
    schema::RemoteSyncBufferRow, InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow,
    InvoiceRowRepository, LocationRow, LocationRowRepository, NameStoreJoinRepository,
    NameStoreJoinRow, NumberRow, NumberRowRepository, RepositoryError, RequisitionLineRow,
    RequisitionLineRowRepository, RequisitionRow, RequisitionRowRepository, StockLineRow,
    StockLineRowRepository, StocktakeLineRow, StocktakeLineRowRepository, StocktakeRow,
    StocktakeRowRepository, StorageConnection, TransactionError,
};

use crate::sync::{
    translation_remote::{
        invoice::InvoiceTranslation, invoice_line::InvoiceLineTranslation,
        location::LocationTranslation, name_store_join::NameStoreJoinTranslation,
        number::NumberTranslation, requisition::RequisitionTranslation,
        requisition_line::RequisitionLineTranslation, stock_line::StockLineTranslation,
        stocktake::StocktakeTranslation, stocktake_line::StocktakeLineTranslation,
    },
    SyncImportError, SyncTranslationError,
};

#[derive(Debug, Clone, PartialEq)]
pub enum IntegrationUpsertRecord {
    Number(NumberRow),
    Location(LocationRow),
    StockLine(StockLineRow),
    NameStoreJoin(NameStoreJoinRow),
    Invoice(InvoiceRow),
    InvoiceLine(InvoiceLineRow),
    Stocktake(StocktakeRow),
    StocktakeLine(StocktakeLineRow),
    Requisition(RequisitionRow),
    RequisitionLine(RequisitionLineRow),
}
#[derive(Debug, Clone, PartialEq)]
pub struct IntegrationRecord {
    pub upserts: Vec<IntegrationUpsertRecord>,
}

impl IntegrationRecord {
    pub fn from_upsert(record: IntegrationUpsertRecord) -> Self {
        IntegrationRecord {
            upserts: vec![record],
        }
    }
}

pub trait RemotePullTranslation {
    fn try_translate_pull(
        &self,
        connection: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<IntegrationRecord>, anyhow::Error>;
}

/// Imports sync records and writes them to the DB
/// If needed data records are translated to the local DB schema.
pub fn import_sync_pull_records(
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
        do_translation(connection, &record, &mut integration_records)?;
    }
    info!("Succesfully translated remote sync buffer records");

    info!("Storing integration remote records...");
    store_integration_records(connection, &integration_records)?;
    info!("Successfully stored integration remote records");

    Ok(())
}

fn do_translation(
    connection: &StorageConnection,
    sync_record: &RemoteSyncBufferRow,
    records: &mut IntegrationRecord,
) -> Result<(), SyncTranslationError> {
    let translations: Vec<Box<dyn RemotePullTranslation>> = vec![
        Box::new(NumberTranslation {}),
        Box::new(LocationTranslation {}),
        Box::new(StockLineTranslation {}),
        // Don't pull name store joins for now
        Box::new(NameStoreJoinTranslation {}),
        Box::new(InvoiceTranslation {}),
        Box::new(InvoiceLineTranslation {}),
        Box::new(StocktakeTranslation {}),
        Box::new(StocktakeLineTranslation {}),
        Box::new(RequisitionTranslation {}),
        Box::new(RequisitionLineTranslation {}),
    ];
    for translation in translations {
        match translation.try_translate_pull(connection, sync_record) {
            Ok(Some(mut result)) => {
                records.upserts.append(&mut result.upserts);
                return Ok(());
            }
            Err(error) => warn!(
                "Failed to translate ({}): {:?}",
                SyncTranslationError {
                    table_name: sync_record.table_name.clone(),
                    source: error,
                    record: format!("{:?}", sync_record),
                },
                sync_record
            ),
            _ => {}
        };
    }
    warn!("Unhandled remote pull record: {:?}", sync_record);
    Ok(())
}

fn integrate_record(
    record: &IntegrationUpsertRecord,
    con: &StorageConnection,
) -> Result<(), RepositoryError> {
    match &record {
        IntegrationUpsertRecord::Number(record) => NumberRowRepository::new(con).upsert_one(record),
        IntegrationUpsertRecord::Location(record) => {
            LocationRowRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::StockLine(record) => {
            StockLineRowRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::NameStoreJoin(record) => {
            NameStoreJoinRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::Invoice(record) => {
            InvoiceRowRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::InvoiceLine(record) => {
            InvoiceLineRowRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::Stocktake(record) => {
            StocktakeRowRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::StocktakeLine(record) => {
            StocktakeLineRowRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::Requisition(record) => {
            RequisitionRowRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::RequisitionLine(record) => {
            RequisitionLineRowRepository::new(con).upsert_one(record)
        }
    }
}

fn store_integration_records(
    connection: &StorageConnection,
    integration_records: &IntegrationRecord,
) -> Result<(), SyncImportError> {
    connection
        .transaction_sync(|con| {
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
        .map_err(|error| match error {
            TransactionError::Transaction { msg, level } => SyncImportError::as_integration_error(
                RepositoryError::TransactionError { msg, level },
                "",
            ),
            TransactionError::Inner(e) => e,
        })
}
