use crate::{
    sync_processor::{process_records, Record},
    WithDBError,
};
use repository::Name;
use repository::{
    schema::InvoiceRowStatus, InvoiceLineRowRepository, InvoiceRepository, RepositoryError,
    StockLineRowRepository, StorageConnection, TransactionError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

use self::generate::LineAndStockLine;

pub enum UpdateInboundShipmentStatus {
    Delivered,
    Verified,
}

pub struct UpdateInboundShipment {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<UpdateInboundShipmentStatus>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
}

pub fn update_inbound_shipment(
    connection: &StorageConnection,
    patch: UpdateInboundShipment,
) -> Result<String, UpdateInboundShipmentError> {
    let update_invoice = connection
        .transaction_sync(|connection| {
            let (invoice, other_party) = validate(&patch, connection)?;
            let (lines_and_invoice_lines_option, update_invoice) =
                generate(connection, invoice, other_party, patch)?;

            InvoiceRepository::new(&connection).upsert_one(&update_invoice)?;

            if let Some(lines_and_invoice_lines) = lines_and_invoice_lines_option {
                let stock_line_repository = StockLineRowRepository::new(&connection);
                let invoice_line_respository = InvoiceLineRowRepository::new(&connection);

                for LineAndStockLine { line, stock_line } in lines_and_invoice_lines.into_iter() {
                    stock_line_repository.upsert_one(&stock_line)?;
                    invoice_line_respository.upsert_one(&line)?;
                }
            }
            Ok(update_invoice)
        })
        .map_err(
            |error: TransactionError<UpdateInboundShipmentError>| match error {
                TransactionError::Transaction { msg, level } => {
                    RepositoryError::TransactionError { msg, level }.into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;

    // TODO use change log (and maybe ask sync porcessor actor to retrigger here)
    println!(
        "{:#?}",
        process_records(connection, vec![Record::InvoiceRow(update_invoice.clone())],)
    );

    Ok(update_invoice.id)
}

#[derive(Debug)]
pub enum UpdateInboundShipmentError {
    InvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    OtherPartyDoesNotExist,
    OtherPartyNotASupplier(Name),
    NotAnInboundShipment,
    NotThisStoreInvoice,
    CannotReverseInvoiceStatus,
    CannotEditFinalised,
    CannotChangeStatusOfInvoiceOnHold,
}

impl From<RepositoryError> for UpdateInboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        UpdateInboundShipmentError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateInboundShipmentError
where
    ERR: Into<UpdateInboundShipmentError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

impl UpdateInboundShipmentStatus {
    pub fn full_status(&self) -> InvoiceRowStatus {
        match self {
            UpdateInboundShipmentStatus::Delivered => InvoiceRowStatus::Delivered,
            UpdateInboundShipmentStatus::Verified => InvoiceRowStatus::Verified,
        }
    }
}

impl UpdateInboundShipment {
    pub fn full_status(&self) -> Option<InvoiceRowStatus> {
        match &self.status {
            Some(status) => Some(status.full_status()),
            None => None,
        }
    }
}
