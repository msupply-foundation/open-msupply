use chrono::NaiveDate;
use log::{info, warn};
use repository::{
    schema::{
        InvoiceLineRow, InvoiceRow, NameStoreJoinRow, NumberRow, RemoteSyncBufferRow, StockLineRow,
    },
    InvoiceLineRowRepository, InvoiceRepository, NameStoreJoinRepository, NumberRowRepository,
    RepositoryError, StockLineRowRepository, StorageConnection, TransactionError,
};
use serde::{Deserialize, Deserializer};

use crate::sync::translation_remote::{
    shipment::ShipmentTranslation, shipment_line::ShipmentLineTranslation,
};

use self::number::NumberTranslation;
use self::stock_line::StockLineTranslation;

use super::{SyncImportError, SyncTranslationError};

mod name_store_join;
mod number;
mod shipment;
mod shipment_line;
mod stock_line;
pub mod test_data;

#[derive(Debug, Clone, PartialEq)]
pub enum IntegrationUpsertRecord {
    Number(NumberRow),
    StockLine(StockLineRow),
    NameStoreJoin(NameStoreJoinRow),
    Shipment(InvoiceRow),
    ShipmentLine(InvoiceLineRow),
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
    ) -> Result<Option<IntegrationRecord>, SyncTranslationError>;
}

pub const TRANSLATION_RECORD_NUMBER: &str = "number";
/// stock line
pub const TRANSLATION_RECORD_ITEM_LINE: &str = "item_line";
pub const TRANSLATION_RECORD_NAME_STORE_JOIN: &str = "name_store_join";
pub const TRANSLATION_RECORD_TRANSACT: &str = "transact";
pub const TRANSLATION_RECORD_TRANS_LINE: &str = "trans_line";

/// Returns a list of records that can be translated. The list is topologically sorted, i.e. items
/// at the beginning of the list don't rely on later items to be translated first.
pub const REMOTE_TRANSLATION_RECORDS: &[&str] = &[
    TRANSLATION_RECORD_NUMBER,
    TRANSLATION_RECORD_ITEM_LINE,
    TRANSLATION_RECORD_NAME_STORE_JOIN,
    TRANSLATION_RECORD_TRANSACT,
    TRANSLATION_RECORD_TRANS_LINE,
];

/// Imports sync records and writes them to the DB
/// If needed data records are translated to the local DB schema.
pub fn import_sync_records(
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
        Box::new(StockLineTranslation {}),
        Box::new(ShipmentTranslation {}),
        Box::new(ShipmentLineTranslation {}),
    ];
    for translation in translations {
        if let Some(mut result) = translation.try_translate_pull(connection, sync_record)? {
            records.upserts.append(&mut result.upserts);
            return Ok(());
        }
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
        IntegrationUpsertRecord::StockLine(record) => {
            StockLineRowRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::NameStoreJoin(record) => {
            NameStoreJoinRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::Shipment(record) => InvoiceRepository::new(con).upsert_one(record),
        IntegrationUpsertRecord::ShipmentLine(record) => {
            InvoiceLineRowRepository::new(con).upsert_one(record)
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

pub fn empty_str_as_option<'de, D: Deserializer<'de>>(d: D) -> Result<Option<String>, D::Error> {
    let s: Option<String> = Option::deserialize(d)?;
    Ok(s.filter(|s| !s.is_empty()))
}

pub fn zero_date_as_option<'de, D: Deserializer<'de>>(d: D) -> Result<Option<NaiveDate>, D::Error> {
    let s: Option<String> = Option::deserialize(d)?;
    Ok(s.filter(|s| s != "0000-00-00")
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok()))
}
