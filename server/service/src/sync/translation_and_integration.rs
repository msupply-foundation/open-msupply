use super::{
    sync_buffer::SyncBuffer,
    translations::{all_translators, IntegrationRecords, PullUpsertRecord, SyncTanslators},
};
use repository::*;
use std::collections::HashMap;
pub(crate) struct TranslationAndIntegration<'a> {
    connection: &'a StorageConnection,
    sync_buffer: &'a SyncBuffer<'a>,
}

type TranslationAndIntegrationError = (
    Option<SyncBufferRow>,
    Option<IntegrationRecords>,
    anyhow::Error,
);

#[derive(Default, Debug)]
pub(crate) struct TranslationAndIntegrationResult {
    pub(crate) integrated_count: u32,
    pub(crate) errors_count: u32,
    pub(crate) errors: Vec<TranslationAndIntegrationError>,
}
type TableName = String;
#[derive(Default, Debug)]
pub struct TranslationAndIntegrationResults(HashMap<TableName, TranslationAndIntegrationResult>);

impl<'a> TranslationAndIntegration<'a> {
    pub(crate) fn new(
        connection: &'a StorageConnection,
        sync_buffer: &'a SyncBuffer,
    ) -> TranslationAndIntegration<'a> {
        TranslationAndIntegration {
            connection,
            sync_buffer,
        }
    }

    fn translate_sync_record(
        &self,
        sync_record: &SyncBufferRow,
        translators: &SyncTanslators,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let mut translators_iter = translators.iter();

        let result = loop {
            let translator = match translators_iter.next() {
                Some(translator) => translator,
                None => break None,
            };

            if let Some(records) = translator.try_translate_pull(self.connection, &sync_record)? {
                break Some(records);
            }
        };

        Ok(result)
    }

    pub(crate) fn translate_and_integrate_sync_records(
        &self,
        sync_records: Vec<SyncBufferRow>,
    ) -> Result<TranslationAndIntegrationResults, RepositoryError> {
        let mut result = TranslationAndIntegrationResults::new();
        let translators = all_translators();

        for sync_record in sync_records {
            // Try translate
            let translation_result = match self.translate_sync_record(&sync_record, &translators) {
                Ok(translation_result) => translation_result,
                // Record error in sync buffer and in result, continue to next sync_record
                Err(translation_error) => {
                    self.sync_buffer
                        .record_integration_error(&sync_record, &translation_error)?;
                    result.insert_error(
                        &sync_record.table_name,
                        Some(&sync_record),
                        None,
                        translation_error,
                    );
                    // Next sync_record
                    continue;
                }
            };

            let integration_records = match translation_result {
                Some(integration_records) => integration_records,
                // Record translator not found error in sync buffer and in result, continue to next sync_record
                None => {
                    let error = anyhow::anyhow!("Translator for record not found");
                    self.sync_buffer
                        .record_integration_error(&sync_record, &error)?;
                    result.insert_error(&sync_record.table_name, Some(&sync_record), None, error);
                    // Next sync_record
                    continue;
                }
            };

            // Integrate
            let integration_result = integration_records.integrate(self.connection);
            match integration_result {
                Ok(_) => {
                    self.sync_buffer
                        .record_successfull_integration(&sync_record)?;
                    result.insert_success(&sync_record.table_name)
                }
                // Record database_error in sync buffer and in resul
                Err(database_error) => {
                    let error = anyhow::anyhow!("{:?}", database_error);
                    self.sync_buffer
                        .record_integration_error(&sync_record, &error)?;
                    result.insert_error(
                        &sync_record.table_name,
                        Some(&sync_record),
                        Some(&integration_records),
                        error,
                    );
                }
            }
        }
        Ok(result)
    }
}

impl IntegrationRecords {
    pub(crate) fn integrate(&self, connection: &StorageConnection) -> Result<(), RepositoryError> {
        for upsert in self.upserts.iter() {
            upsert.upsert(connection)?
        }

        Ok(())
    }
}

impl PullUpsertRecord {
    pub(crate) fn upsert(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        use PullUpsertRecord::*;
        match self {
            Name(record) => NameRowRepository::new(con).upsert_one(record),
            Unit(record) => UnitRowRepository::new(con).upsert_one(record),
            Item(record) => ItemRowRepository::new(con).upsert_one(record),
            Store(record) => StoreRowRepository::new(con).upsert_one(record),
            MasterList(record) => MasterListRowRepository::new(con).upsert_one(record),
            MasterListLine(record) => MasterListLineRowRepository::new(con).upsert_one(record),
            MasterListNameJoin(record) => MasterListNameJoinRepository::new(con).upsert_one(record),
            Report(record) => ReportRowRepository::new(con).upsert_one(record),
            Number(record) => NumberRowRepository::new(con).upsert_one(record),
            Location(record) => LocationRowRepository::new(con).upsert_one(record),
            StockLine(record) => StockLineRowRepository::new(con).upsert_one(record),
            NameStoreJoin(record) => NameStoreJoinRepository::new(con).upsert_one(record),
            Invoice(record) => InvoiceRowRepository::new(con).upsert_one(record),
            InvoiceLine(record) => InvoiceLineRowRepository::new(con).upsert_one(record),
            Stocktake(record) => StocktakeRowRepository::new(con).upsert_one(record),
            StocktakeLine(record) => StocktakeLineRowRepository::new(con).upsert_one(record),
            Requisition(record) => RequisitionRowRepository::new(con).upsert_one(record),
            RequisitionLine(record) => RequisitionLineRowRepository::new(con).upsert_one(record),
        }
    }
}

impl TranslationAndIntegrationResults {
    fn new() -> TranslationAndIntegrationResults {
        Default::default()
    }

    fn insert_error(
        &mut self,
        table_name: &str,
        sync_record: Option<&SyncBufferRow>,
        integration_records: Option<&IntegrationRecords>,
        error: anyhow::Error,
    ) {
        let entry = self
            .0
            .entry(table_name.to_owned())
            .or_insert(Default::default());
        entry.errors_count += 1;
        entry.errors.push((
            sync_record.map(Clone::clone),
            integration_records.map(Clone::clone),
            error,
        ));
    }

    fn insert_success(&mut self, table_name: &str) {
        let entry = self
            .0
            .entry(table_name.to_owned())
            .or_insert(Default::default());
        entry.integrated_count += 1;
    }

    #[cfg(test)]
    pub(crate) fn all_errors(&self) -> HashMap<String, &Vec<TranslationAndIntegrationError>> {
        self.0
            .iter()
            .filter_map(|(table_name, value)| {
                if value.errors_count == 0 {
                    return None;
                }

                Some((table_name.to_owned(), &value.errors))
            })
            .collect()
    }
}
