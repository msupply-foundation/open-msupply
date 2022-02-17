pub mod query;
use domain::invoice::Invoice;
use domain::invoice::InvoiceType;
use repository::RepositoryError;

use crate::service_provider::ServiceContext;

pub use self::query::*;

pub mod outbound_shipment;
pub use self::outbound_shipment::*;

pub mod inbound_shipment;
pub use self::inbound_shipment::*;

pub mod validate;
pub use self::validate::*;

pub trait InvoiceServiceTrait: Sync + Send {
    fn get_invoice_by_number(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        invoice_number: u32,
        r#type: InvoiceType,
    ) -> Result<Option<Invoice>, RepositoryError> {
        get_invoice_by_number(ctx, store_id, invoice_number, r#type)
    }
}

pub struct InvoiceService;
impl InvoiceServiceTrait for InvoiceService {}
