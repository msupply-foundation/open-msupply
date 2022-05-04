use repository::EqualFilter;
use repository::{
    InvoiceFilter, InvoiceRepository, InvoiceRow, NameRow, NameRowRepository, RepositoryError,
    RequisitionFilter, RequisitionRepository, RequisitionRow, StorageConnection, StoreRow,
    StoreRowRepository,
};

use self::{
    invoice::{
        create_and_link_inbound_shipment::CreateAndLinkInboundShipmentProcessor,
        create_inbound_shipment::CreateInboundShipmentProcessor,
        update_inbound_shipment::UpdateInboundShipmentProcessor,
        update_outbound_shipment_status::UpdateOutboundShipmentStatusProcessor,
    },
    requisition::{
        create_and_link_response_requisition::CreateAndLinkResponseRequisitionProcessor,
        create_response_requisition::CreateResponseRequisitionProcessor,
        update_request_requisition_status::UpdateRequestRequisitionStatusProcessor,
    },
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
    CannotFindNameForSourceRecord(Record),
    CannotFindStoreForSourceRecord(Record),
    CannotFindNameForStoreSourceRecord(StoreRow),
    OtherPartyStoreIsNotFound(RecordForProcessing),
    CannotFindStatsForItemAndStore { store_id: String, item_id: String },
    DatabaseError(RepositoryError),
}
#[derive(Debug)]
pub enum ProcessRecordResult {
    ProcessRecordResult(String),
    ProcessorNotMatched,
}

#[derive(Debug)]
pub struct ProcessRecordResultSet {
    pub result: ProcessRecordResult,
    pub record: RecordForProcessing,
}

pub fn process_records(
    connection: &StorageConnection,
    records: Vec<Record>,
) -> Result<Vec<ProcessRecordResultSet>, ProcessRecordError> {
    let processors: Vec<Box<dyn SyncProcessor>> = vec![
        // Requisitions
        Box::new(CreateResponseRequisitionProcessor { connection }),
        Box::new(CreateAndLinkResponseRequisitionProcessor { connection }),
        Box::new(CreateAndLinkResponseRequisitionProcessor { connection }),
        Box::new(UpdateRequestRequisitionStatusProcessor { connection }),
        // Shipments
        Box::new(CreateInboundShipmentProcessor { connection }),
        Box::new(CreateAndLinkInboundShipmentProcessor { connection }),
        Box::new(UpdateInboundShipmentProcessor { connection }),
        Box::new(UpdateOutboundShipmentStatusProcessor { connection }),
    ];
    // TODO transaction
    let mut results = Vec::new();

    for record in records.into_iter() {
        // Create record_for-processing
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

        // Iterate over processors
        let mut processor_matched = false;

        for processor in processors.iter() {
            if let Some(result) = processor.try_process_record(&record_for_processing)? {
                results.push(ProcessRecordResultSet {
                    result: ProcessRecordResult::ProcessRecordResult(result),
                    record: record_for_processing.clone(),
                });
                processor_matched = true;
                break;
            }
        }

        if !processor_matched {
            results.push(ProcessRecordResultSet {
                result: ProcessRecordResult::ProcessorNotMatched,
                record: record_for_processing,
            })
        }
    }

    Ok(results)
}

pub trait SyncProcessor {
    fn try_process_record(
        &self,
        record_for_processing: &RecordForProcessing,
    ) -> Result<Option<String>, ProcessRecordError>;
}

fn get_other_party_store(
    connection: &StorageConnection,
    record: &Record,
) -> Result<Option<StoreRow>, ProcessRecordError> {
    let name_id = match record {
        Record::RequisitionRow(requisition_row) => &requisition_row.name_id,
        Record::InvoiceRow(invoice_row) => &invoice_row.name_id,
    };

    Ok(StoreRowRepository::new(connection).find_one_by_name_id(name_id)?)
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
        .ok_or(ProcessRecordError::CannotFindStoreForSourceRecord(
            record.clone(),
        ))?;

    let result = NameRowRepository::new(connection)
        .find_one_by_id(&store.name_id)?
        .ok_or(ProcessRecordError::CannotFindNameForStoreSourceRecord(
            store,
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
        Record::InvoiceRow(invoice) => InvoiceRepository::new(connection)
            .query_one(InvoiceFilter::new().linked_invoice_id(EqualFilter::equal_to(&invoice.id)))?
            .map(|invoice| Record::InvoiceRow(invoice.invoice_row)),
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

impl From<RepositoryError> for ProcessRecordError {
    fn from(error: RepositoryError) -> Self {
        ProcessRecordError::DatabaseError(error)
    }
}
