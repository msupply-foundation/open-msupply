use async_graphql::*;

use super::{Connector, InvoiceLineNode, ItemNode, ItemStats};

#[derive(PartialEq, Debug)]
pub struct RequisitionLineNode {}

#[derive(SimpleObject)]
pub struct RequisitionLineConnector {
    total_count: u32,
    nodes: Vec<RequisitionLineNode>,
}

#[Object]
impl RequisitionLineNode {
    pub async fn id(&self) -> &str {
        todo!()
    }

    pub async fn item_id(&self) -> &str {
        todo!()
    }

    pub async fn item(&self) -> Result<ItemNode> {
        todo!()
    }

    /// Quantity requested
    pub async fn requested_quantity(&self) -> u32 {
        todo!()
    }

    /// Quantity to be supplied in the next shipment, only used in response requisition
    pub async fn supply_quantity(&self) -> u32 {
        todo!()
    }

    /// Calculated quantity
    /// When months_of_stock < requisition.threshold_months_of_stock, calculated = average_monthy_consumption * requisition.max_months_of_stock - months_of_stock
    pub async fn calculated_quantity(&self) -> u32 {
        todo!()
    }

    /// OutboundShipment lines linked to requisitions line
    pub async fn outbound_shipment_lines(&self) -> Result<Connector<InvoiceLineNode>> {
        todo!()
    }

    /// InboundShipment lines linked to requisitions line
    pub async fn inbound_shipment_lines(&self) -> Result<Connector<InvoiceLineNode>> {
        todo!()
    }

    /// Snapshot of item statistics for requisition owner store
    pub async fn stats(&self) -> Result<ItemStats> {
        todo!()
    }

    /// Snapshot of item statistics from request requistion
    /// For request requsition it's the same as stats
    pub async fn request_stats(&self) -> Result<ItemStats> {
        todo!()
    }
}
