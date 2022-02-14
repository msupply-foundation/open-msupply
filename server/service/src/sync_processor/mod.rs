use domain::{invoice::InvoiceFilter, name::NameFilter, EqualFilter};
use repository::{
    schema::{InvoiceRow, NameRow, RequisitionRow, StoreRow},
    InvoiceQueryRepository, InvoiceRepository, NameQueryRepository, NameRepository,
    RepositoryError, RequisitionFilter, RequisitionRepository, StorageConnection,
    StoreRowRepository,
};

use self::{
    invoice::{
        create_and_link_invoice::{
            create_and_line_invoice_processor, CreateAndLinkInvoiceProcessoResult,
        },
        create_invoice::{create_invoice_processor, CreateInvoiceProcessoResult},
        update_inbound_shipment::{
            update_inbound_shipment_processor, UpdateInboundShipmentProcessorResult,
        },
        update_outbound_shipment_status::{
            update_outbound_shipment_status_processor, UpdateOutboundShipmentStatusProcessorResult,
        },
    },
    requisition::{
        create_and_link_requisition::{
            create_and_link_requisition_processor, CreateAndLinkeRequisitionProcessorResult,
        },
        create_requisition::{create_requisition_processor, CreateRequisitionProcessorResult},
        update_request_status::{
            update_requisition_status_processor, UpdateRequisitionStatusProcessorResult,
        },
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
    CreateAndLinkeRequisitionProcessorResult(CreateAndLinkeRequisitionProcessorResult),
    UpdateRequisitionStatusProcessorResult(UpdateRequisitionStatusProcessorResult),
    CreateRequisitionProcessorResult(CreateRequisitionProcessorResult),
    CreateInvoiceProcessoResult(CreateInvoiceProcessoResult),
    CreateAndLinkInvoiceProcessoResult(CreateAndLinkInvoiceProcessoResult),
    UpdateInboundShipmentProcessorResult(UpdateInboundShipmentProcessorResult),
    UpdateOutboundShipmentStatusProcessorResult(UpdateOutboundShipmentStatusProcessorResult),
    NoProcessorMatched,
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

        // Run through processors

        // Requisitions
        if let Some(result) = create_requisition_processor(connection, &record_for_processing)? {
            results.push(ProcessRecordResultSet {
                result: ProcessRecordResult::CreateRequisitionProcessorResult(result),
                record: record_for_processing,
            });
            continue;
        }

        if let Some(result) =
            create_and_link_requisition_processor(connection, &record_for_processing)?
        {
            results.push(ProcessRecordResultSet {
                result: ProcessRecordResult::CreateAndLinkeRequisitionProcessorResult(result),
                record: record_for_processing,
            });
            continue;
        }

        if let Some(result) =
            update_requisition_status_processor(connection, &record_for_processing)?
        {
            results.push(ProcessRecordResultSet {
                result: ProcessRecordResult::UpdateRequisitionStatusProcessorResult(result),
                record: record_for_processing,
            });
            continue;
        }

        // Invoices
        if let Some(result) = create_invoice_processor(connection, &record_for_processing)? {
            results.push(ProcessRecordResultSet {
                result: ProcessRecordResult::CreateInvoiceProcessoResult(result),
                record: record_for_processing,
            });
            continue;
        }

        if let Some(result) = create_and_line_invoice_processor(connection, &record_for_processing)?
        {
            results.push(ProcessRecordResultSet {
                result: ProcessRecordResult::CreateAndLinkInvoiceProcessoResult(result),
                record: record_for_processing,
            });
            continue;
        }

        if let Some(result) = update_inbound_shipment_processor(connection, &record_for_processing)?
        {
            results.push(ProcessRecordResultSet {
                result: ProcessRecordResult::UpdateInboundShipmentProcessorResult(result),
                record: record_for_processing,
            });
            continue;
        }

        if let Some(result) =
            update_outbound_shipment_status_processor(connection, &record_for_processing)?
        {
            results.push(ProcessRecordResultSet {
                result: ProcessRecordResult::UpdateOutboundShipmentStatusProcessorResult(result),
                record: record_for_processing,
            });
            continue;
        }

        // No processors matched
        results.push(ProcessRecordResultSet {
            result: ProcessRecordResult::NoProcessorMatched,
            record: record_for_processing,
        });
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
        .ok_or(ProcessRecordError::CannotFindNameForSourceRecord(
            record.clone(),
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
        .ok_or(ProcessRecordError::CannotFindStoreForSourceRecord(
            record.clone(),
        ))?;

    let result = NameRepository::new(connection)
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
        Record::InvoiceRow(invoice) => {
            let invoice = InvoiceQueryRepository::new(connection).query_one(
                InvoiceFilter::new().linked_invoice_id(EqualFilter::equal_to(&invoice.id)),
            )?;
            // TODO change when invoice domain is composite of InvoiceRow
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

impl From<RepositoryError> for ProcessRecordError {
    fn from(error: RepositoryError) -> Self {
        ProcessRecordError::DatabaseError(error)
    }
}
