pub mod query;
pub mod validate;
use domain::invoice_line::InvoiceLine;

use crate::service_provider::ServiceContext;

pub use self::query::*;

pub mod inbound_shipment_line;
pub use self::inbound_shipment_line::*;

pub mod outbound_shipment_line;
pub use self::outbound_shipment_line::*;

pub mod outbound_shipment_service_line;
pub use self::outbound_shipment_service_line::*;

pub mod outbound_shipment_unallocated_line;
pub use self::outbound_shipment_unallocated_line::*;

pub trait OutboundShipmentLineServiceTrait: Sync + Send {
    fn insert_outbound_shipment_unallocated_line(
        &self,
        ctx: &ServiceContext,
        input: InsertOutboundShipmentUnallocatedLine,
    ) -> Result<InvoiceLine, InsertOutboundShipmentUnallocatedLineError> {
        insert_outbound_shipment_unallocated_line(ctx, input)
    }

    fn update_outbound_shipment_unallocated_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateOutboundShipmentUnallocatedLine,
    ) -> Result<InvoiceLine, UpdateOutboundShipmentUnallocatedLineError> {
        update_outbound_shipment_unallocated_line(ctx, input)
    }

    fn delete_outbound_shipment_unallocated_line(
        &self,
        ctx: &ServiceContext,
        input: DeleteOutboundShipmentUnallocatedLine,
    ) -> Result<String, DeleteOutboundShipmentUnallocatedLineError> {
        delete_outbound_shipment_unallocated_line(ctx, input)
    }
}

pub struct OutboundShipmentLineService {}
impl OutboundShipmentLineServiceTrait for OutboundShipmentLineService {}
