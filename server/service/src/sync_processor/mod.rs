use crate::sync_processor::{
    invoice::{
        create_and_link_invoice::CreateAndLinkInvoiceProcessor,
        create_invoice::CreateInvoiceProcessor,
        update_outbound_shipment_status::UpdateOutboundShipmentStatusProcessor, update_inbound_shipment::UpdateInboundShipmentProcessor,
    },
    requisition::{
        create_and_link_requisition::CreateAndLinkRequistionProcessor,
        create_requisition::CreateRequistionProcessor,
        update_request_status::UpdateRequisitionStatusProcessor,
    },
};
use domain::{invoice::InvoiceFilter, EqualFilter};
use repository::{
    schema::{InvoiceRow, RequisitionRow},
    InvoiceQueryRepository, InvoiceRepository, RepositoryError, RequisitionFilter,
    RequisitionRepository, StorageConnection,
};

pub mod invoice;
pub mod requisition;
mod test;

#[derive(Debug)]
pub enum Record {
    RequisitionRow(RequisitionRow),
    InvoiceRow(InvoiceRow),
}
#[derive(Debug)]
pub struct RecordForProcessing {
    pub record: Record,
    pub is_active_record_on_site: bool,
    pub is_other_party_active_on_site: bool,
    pub linked_record: Option<Record>,
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
}

#[derive(Debug)]
pub struct ProcessRecordResultSet {
    pub result: ProcessRecordResult,
    pub processor_name: String,
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
        let record_for_processing = RecordForProcessing {
            is_active_record_on_site: is_active_record_on_site(connection, &record)?,
            is_other_party_active_on_site: is_other_party_active_on_site(connection, &record)?,
            linked_record: get_linked_record(connection, &record)?,
            record,
        };

        // iterators don't work for dyn box ? (have to annotate type somehow), thus just looping
        let mut i = 0;
        loop {
            if i >= processors.len() {
                break;
            }

            let result = processors[i].process_record(connection, &record_for_processing)?;
            results.push(ProcessRecordResultSet {
                result: result.clone(),
                processor_name: processors[i].name(),
            });

            if let ProcessRecordResult::Success(_) = result {
                break;
            }

            i += 1;
        }
    }

    Ok(results)
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
    _: &Record,
) -> Result<bool, RepositoryError> {
    // TODO
    Ok(true)
}

pub trait ProcessRecord {
    fn process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &RecordForProcessing,
    ) -> Result<ProcessRecordResult, ProcessRecordError>;

    fn name(&self) -> String;
}

impl From<RepositoryError> for ProcessRecordError {
    fn from(error: RepositoryError) -> Self {
        ProcessRecordError::DatabaseError(error)
    }
}
