use crate::preference::{ExternalInboundShipmentLinesMustBeAuthorised, Preference};
use repository::InvoiceRow;
use repository::InvoiceStatus;
use repository::InvoiceType;
use repository::StorageConnection;

pub mod generate;
pub mod validate;

pub mod delete;
pub mod insert;
pub mod update;
pub use self::delete::*;
pub use self::insert::*;
pub use self::update::*;

pub use self::generate::*;
pub use self::validate::*;

#[derive(Clone, Debug, Default, PartialEq)]
pub enum StockInType {
    #[default]
    CustomerReturn,
    InventoryAddition,
    InboundShipment,
}

impl StockInType {
    pub fn to_domain(&self) -> InvoiceType {
        match self {
            StockInType::CustomerReturn => InvoiceType::CustomerReturn,
            StockInType::InventoryAddition => InvoiceType::InventoryAddition,
            StockInType::InboundShipment => InvoiceType::InboundShipment,
        }
    }
}

/// An external inbound shipment subject to line authorisation can only be
/// received once every line is approved or rejected, so its set of lines is
/// locked from then on — lines cannot be added or deleted, though other line
/// details remain editable.
pub fn check_lines_locked_by_authorisation(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
) -> bool {
    // Only external inbound shipments (linked to a purchase order) are
    // subject to line authorisation
    if invoice.purchase_order_id.is_none()
        || !matches!(
            invoice.status,
            InvoiceStatus::Received | InvoiceStatus::Verified
        )
    {
        return false;
    }
    ExternalInboundShipmentLinesMustBeAuthorised
        .load(connection, Some(invoice.store_id.clone()))
        .unwrap_or(false)
}

pub fn should_update_stock(invoice: &InvoiceRow) -> bool {
    match invoice.status {
        InvoiceStatus::New | InvoiceStatus::Delivered => false,
        InvoiceStatus::Allocated
        | InvoiceStatus::Picked
        | InvoiceStatus::Shipped
        | InvoiceStatus::Cancelled
        | InvoiceStatus::Received
        | InvoiceStatus::Verified => true,
    }
}
