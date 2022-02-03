use crate::sync_processor::{
    invoice::{
        create_and_link_invoice::CreateAndLinkInvoiceProcessor,
        create_invoice::CreateInvoiceProcessor,
        update_inbound_shipment::UpdateInboundShipmentProcessor,
        update_outbound_shipment_status::UpdateOutboundShipmentStatusProcessor,
    },
    requisition::{
        create_and_link_requisition::CreateAndLinkRequistionProcessor,
        create_requisition::CreateRequistionProcessor,
        update_request_status::UpdateRequisitionStatusProcessor,
    },
};
use domain::{invoice::InvoiceFilter, name::NameFilter, EqualFilter};
use repository::{
    schema::{InvoiceRow, NameRow, RequisitionRow, StoreRow},
    InvoiceQueryRepository, InvoiceRepository, NameQueryRepository, NameRepository,
    RepositoryError, RequisitionFilter, RequisitionRepository, StorageConnection,
    StoreRowRepository,
};

pub mod invoice;
pub mod requisition;
mod test;

#[derive(Debug, Clone)]
pub enum Record {
    RequisitionRow(RequisitionRow),
    InvoiceRow(InvoiceRow),
}
#[derive(Debug, Clone)]
pub struct RecordForProcessing {
    pub record: Record,
    pub is_active_record_on_site: bool,
    pub is_other_party_active_on_site: bool,
    pub linked_record: Option<Record>,
    pub other_party_store: Option<StoreRow>,
    pub source_name: NameRow,
}
#[derive(Debug)]
pub enum ProcessRecordError {
    StringError(String),
    DatabaseError(RepositoryError),
}

#[derive(Clone, Debug)]
pub enum ProcessRecordResult {
    Success(String),
    ConditionNotMet,
    ConditionNotMetInProcessor,
}

#[derive(Debug)]
pub struct ProcessRecordResultSet {
    pub result: ProcessRecordResult,
    pub processor_name: String,
    pub record: RecordForProcessing,
}

pub fn processors() -> Vec<Box<dyn ProcessRecord>> {
    vec![
        Box::new(CreateAndLinkRequistionProcessor {}),
        Box::new(CreateRequistionProcessor {}),
        Box::new(UpdateRequisitionStatusProcessor {}),
        Box::new(CreateAndLinkInvoiceProcessor {}),
        Box::new(CreateInvoiceProcessor {}),
        // TODO delete picked outbound shipment ?
        Box::new(UpdateInboundShipmentProcessor {}),
        Box::new(UpdateOutboundShipmentStatusProcessor {}),
    ]
}

pub fn process_records(
    connection: &StorageConnection,
    records: Vec<Record>,
) -> Result<Vec<ProcessRecordResultSet>, ProcessRecordError> {
    let processors = processors();
    // TODO transaction
    let mut results = Vec::new();

    for record in records.into_iter() {
        let source_name = get_source_name(connection, &record)?;
        let other_party_store = get_other_party_store(connection, &record)?;

        let record_for_processing = RecordForProcessing {
            is_active_record_on_site: is_active_record_on_site(connection, &record)?,
            is_other_party_active_on_site: is_other_party_active_on_site(
                connection,
                &other_party_store,
                &record,
            )?,
            linked_record: get_linked_record(connection, &record)?,
            other_party_store,
            source_name,
            record,
        };

        // iterators don't work for dyn box ? (have to annotate type somehow), thus just looping
        let mut i = 0;
        loop {
            if i >= processors.len() {
                break;
            }

            let processor_name = processors[i].name();
            if processors[i].can_execute(&record_for_processing) {
                results.push(ProcessRecordResultSet {
                    result: processors[i].process_record(connection, &record_for_processing)?,
                    processor_name,
                    record: record_for_processing.clone(),
                });
                break;
            } else {
                results.push(ProcessRecordResultSet {
                    result: ProcessRecordResult::ConditionNotMet,
                    processor_name,
                    record: record_for_processing.clone(),
                })
            }

            i += 1;
        }
    }

    Ok(results)
}

fn get_other_party_store(
    connection: &StorageConnection,
    record: &Record,
) -> Result<Option<StoreRow>, ProcessRecordError> {
    let name_id = match record {
        Record::RequisitionRow(requisition_row) => &requisition_row.name_id,
        Record::InvoiceRow(invoice_row) => &invoice_row.name_id,
    };

    let name = NameQueryRepository::new(connection)
        .query_one(NameFilter::new().id(EqualFilter::equal_to(&name_id)))?
        .ok_or(ProcessRecordError::StringError(
            "cannot find name for source record".to_string(),
        ))?;

    let result = match name.store_id {
        Some(store_id) => StoreRowRepository::new(connection).find_one_by_id(&store_id)?,
        None => None,
    };
    Ok(result)
}

fn get_source_name(
    connection: &StorageConnection,
    record: &Record,
) -> Result<NameRow, ProcessRecordError> {
    let store_id = match record {
        Record::RequisitionRow(requisition_row) => &requisition_row.store_id,
        Record::InvoiceRow(invoice_row) => &invoice_row.store_id,
    };

    let store = StoreRowRepository::new(connection)
        .find_one_by_id(&store_id)?
        .ok_or(ProcessRecordError::StringError(
            "cannot find store for source record".to_string(),
        ))?;

    let result = NameRepository::new(connection)
        .find_one_by_id(&store.name_id)?
        .ok_or(ProcessRecordError::StringError(
            "cannot find name for store in source record".to_string(),
        ))?;

    Ok(result)
}

fn get_linked_record(
    connection: &StorageConnection,
    record: &Record,
) -> Result<Option<Record>, RepositoryError> {
    let result = match record {
        Record::RequisitionRow(requisition_row) => RequisitionRepository::new(connection)
            .query_one(
                RequisitionFilter::new()
                    .linked_requisition_id(EqualFilter::equal_to(&requisition_row.id)),
            )?
            .map(|requisition| Record::RequisitionRow(requisition.requisition_row)),
        Record::InvoiceRow(invoice) => {
            let invoice = InvoiceQueryRepository::new(connection).query_one(
                InvoiceFilter::new().linked_invoice_id(EqualFilter::equal_to(&invoice.id)),
            )?;
            // TODO change when invoice domain is compositire of InvoiceRow
            if let Some(invoice) = invoice {
                Some(Record::InvoiceRow(
                    InvoiceRepository::new(connection).find_one_by_id(&invoice.id)?,
                ))
            } else {
                None
            }
        }
    };

    Ok(result)
}

fn is_active_record_on_site(_: &StorageConnection, _: &Record) -> Result<bool, RepositoryError> {
    // TODO
    Ok(true)
}

fn is_other_party_active_on_site(
    _: &StorageConnection,
    store_row: &Option<StoreRow>,
    _: &Record,
) -> Result<bool, RepositoryError> {
    // TODO
    Ok(match store_row {
        Some(_) => true,
        None => false,
    })
}

pub trait ProcessRecord {
    fn name(&self) -> String;

    fn can_execute(&self, record_for_processing: &RecordForProcessing) -> bool;

    fn process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &RecordForProcessing,
    ) -> Result<ProcessRecordResult, ProcessRecordError>;
}

impl From<RepositoryError> for ProcessRecordError {
    fn from(error: RepositoryError) -> Self {
        ProcessRecordError::DatabaseError(error)
    }
}
