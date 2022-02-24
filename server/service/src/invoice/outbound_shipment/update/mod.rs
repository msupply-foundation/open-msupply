use repository::Name;
use repository::{
    schema::InvoiceRowStatus, InvoiceLine, InvoiceRepository, RepositoryError,
    StockLineRowRepository, StorageConnection, TransactionError,
};

pub mod generate;
pub mod validate;

use generate::generate;
use validate::validate;

use crate::sync_processor::{process_records, Record};

pub enum UpdateOutboundShipmentStatus {
    Allocated,
    Picked,
    Shipped,
}

pub struct UpdateOutboundShipment {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<UpdateOutboundShipmentStatus>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
}

#[derive(Debug)]
pub enum UpdateOutboundShipmentError {
    CannotReverseInvoiceStatus,
    CannotChangeStatusOfInvoiceOnHold,
    InvoiceDoesNotExists,
    InvoiceIsNotEditable,
    DatabaseError(RepositoryError),
    OtherPartyDoesNotExists,
    OtherPartyNotACustomer(Name),
    OtherPartyCannotBeThisStore,
    NotAnOutboundShipment,
    CanOnlyChangeToAllocatedWhenNoUnallocatedLines(Vec<InvoiceLine>),
    /// Holds the id of the invalid invoice line
    InvoiceLineHasNoStockLine(String),
}

pub fn update_outbound_shipment(
    connection: &StorageConnection,
    patch: UpdateOutboundShipment,
) -> Result<String, UpdateOutboundShipmentError> {
    let update_invoice = connection.transaction_sync(|connection| {
        let (invoice, other_party_option) = validate(&patch, &connection)?;
        let (stock_lines_option, update_invoice) =
            generate(invoice, other_party_option, patch, &connection)?;

        InvoiceRepository::new(&connection).upsert_one(&update_invoice)?;
        if let Some(stock_lines) = stock_lines_option {
            let repository = StockLineRowRepository::new(&connection);
            for stock_line in stock_lines {
                repository.upsert_one(&stock_line)?;
            }
        }
        Ok(update_invoice)
    })?;

    // TODO use change log (and maybe ask sync porcessor actor to retrigger here)
    println!(
        "{:#?}",
        process_records(connection, vec![Record::InvoiceRow(update_invoice.clone())],)
    );

    Ok(update_invoice.id)
}

impl From<RepositoryError> for UpdateOutboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundShipmentError::DatabaseError(error)
    }
}

impl From<TransactionError<UpdateOutboundShipmentError>> for UpdateOutboundShipmentError {
    fn from(error: TransactionError<UpdateOutboundShipmentError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                UpdateOutboundShipmentError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}

impl UpdateOutboundShipmentStatus {
    pub fn full_status(&self) -> InvoiceRowStatus {
        match self {
            UpdateOutboundShipmentStatus::Allocated => InvoiceRowStatus::Allocated,
            UpdateOutboundShipmentStatus::Picked => InvoiceRowStatus::Picked,
            UpdateOutboundShipmentStatus::Shipped => InvoiceRowStatus::Shipped,
        }
    }
}

impl UpdateOutboundShipment {
    pub fn full_status(&self) -> Option<InvoiceRowStatus> {
        match &self.status {
            Some(status) => Some(status.full_status()),
            None => None,
        }
    }
}
