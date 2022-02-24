use async_graphql::*;
use dataloader::DataLoader;
use repository::{
    schema::{RequisitionLineRow, RequisitionRow, RequisitionRowType},
    RequisitionLine,
};
use service::{usize_to_u32, ListResult};

use graphql_core::{
    loader::{
        InvoiceLineForRequisitionLine, ItemLoader, LinkedRequisitionLineLoader,
        RequisitionAndItemId,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

use super::{InvoiceLineConnector, ItemNode, ItemStatsNode};

#[derive(PartialEq, Debug)]
pub struct RequisitionLineNode {
    requisition_line: RequisitionLine,
}

#[derive(SimpleObject)]
pub struct RequisitionLineConnector {
    total_count: u32,
    nodes: Vec<RequisitionLineNode>,
}

#[Object]
impl RequisitionLineNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn item_id(&self) -> &str {
        &self.row().item_id
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.row().item_id.clone()).await?;

        item_option.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item_id {} for requisition_line_id {}",
                &self.row().item_id,
                &self.row().id
            ))
            .extend(),
        )
    }

    /// Quantity requested
    pub async fn requested_quantity(&self) -> &i32 {
        &self.row().requested_quantity
    }

    /// Quantity to be supplied in the next shipment, only used in response requisition
    pub async fn supply_quantity(&self) -> &i32 {
        &self.row().supply_quantity
    }

    /// Calculated quantity
    /// When months_of_stock < requisition.min_months_of_stock, calculated = average_monthy_consumption * requisition.max_months_of_stock - months_of_stock
    pub async fn suggested_quantity(&self) -> &i32 {
        &self.row().suggested_quantity
    }

    /// OutboundShipment lines linked to requisitions line
    pub async fn outbound_shipment_lines(&self, ctx: &Context<'_>) -> Result<InvoiceLineConnector> {
        // Outbound shipments link to response requisition, so for request requisition
        // use linked requisition id
        let requisition_row = &self.requisition_line.requisition_row;
        let requisition_id = match requisition_row.r#type {
            RequisitionRowType::Request => match &requisition_row.linked_requisition_id {
                Some(linked_requisition_id) => linked_requisition_id,
                None => return Ok(InvoiceLineConnector::empty()),
            },
            _ => &self.row().requisition_id,
        };

        let loader = ctx.get_loader::<DataLoader<InvoiceLineForRequisitionLine>>();
        let result_option = loader
            .load_one(RequisitionAndItemId {
                requisition_id: requisition_id.clone(),
                item_id: self.row().item_id.clone(),
            })
            .await?;

        let result = result_option.unwrap_or(vec![]);

        Ok(InvoiceLineConnector::from_vec(result))
    }

    /// InboundShipment lines linked to requisitions line
    pub async fn inbound_shipment_lines(&self, ctx: &Context<'_>) -> Result<InvoiceLineConnector> {
        // Outbound shipments links to request requisition, so for response requisition
        // use linked requisition id
        let requisition_row = &self.requisition_line.requisition_row;
        let requisition_id = match requisition_row.r#type {
            RequisitionRowType::Response => match &requisition_row.linked_requisition_id {
                Some(linked_requisition_id) => linked_requisition_id,
                None => return Ok(InvoiceLineConnector::empty()),
            },
            _ => &self.row().requisition_id,
        };

        let loader = ctx.get_loader::<DataLoader<InvoiceLineForRequisitionLine>>();
        let result_option = loader
            .load_one(RequisitionAndItemId {
                requisition_id: requisition_id.clone(),
                item_id: self.row().item_id.clone(),
            })
            .await?;

        let result = result_option.unwrap_or(vec![]);

        Ok(InvoiceLineConnector::from_vec(result))
    }

    /// Snapshot Stats (when requisition was created)
    pub async fn item_stats(&self) -> ItemStatsNode {
        ItemStatsNode {
            average_monthly_consumption: self.row().average_monthly_consumption,
            available_stock_on_hand: self.row().available_stock_on_hand,
        }
    }

    pub async fn linked_requisition_line(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<RequisitionLineNode>> {
        let linked_requisition_id =
            if let Some(linked_requisition_id) = &self.requisition_row().linked_requisition_id {
                linked_requisition_id
            } else {
                return Ok(None);
            };

        let loader = ctx.get_loader::<DataLoader<LinkedRequisitionLineLoader>>();
        let result_option = loader
            .load_one(RequisitionAndItemId {
                requisition_id: linked_requisition_id.clone(),
                item_id: self.row().item_id.clone(),
            })
            .await?;

        Ok(result_option.map(RequisitionLineNode::from_domain))
    }
}

impl RequisitionLineNode {
    pub fn from_domain(requisition_line: RequisitionLine) -> RequisitionLineNode {
        RequisitionLineNode { requisition_line }
    }
}

impl RequisitionLineConnector {
    pub fn from_domain(requisition_lines: ListResult<RequisitionLine>) -> RequisitionLineConnector {
        RequisitionLineConnector {
            total_count: requisition_lines.count,
            nodes: requisition_lines
                .rows
                .into_iter()
                .map(RequisitionLineNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(requisition_lines: Vec<RequisitionLine>) -> RequisitionLineConnector {
        RequisitionLineConnector {
            total_count: usize_to_u32(requisition_lines.len()),
            nodes: requisition_lines
                .into_iter()
                .map(RequisitionLineNode::from_domain)
                .collect(),
        }
    }
}

impl RequisitionLineNode {
    pub fn row(&self) -> &RequisitionLineRow {
        &self.requisition_line.requisition_line_row
    }
    pub fn requisition_row(&self) -> &RequisitionRow {
        &self.requisition_line.requisition_row
    }
}
