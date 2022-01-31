use std::ops::Deref;

use async_graphql::*;
use dataloader::DataLoader;
use repository::{
    schema::{RequisitionLineRow, RequisitionRowType},
    RequisitionLine,
};
use service::{usize_to_u32, ListResult};

use crate::{
    loader::{
        InvoiceLineForRequisitionLine, ItemLoader, LinkedRequisitionLineLoader,
        RequisitionAndItemId,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

use super::{Connector, InvoiceLineNode, ItemNode, ItemStats};

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
        &self.id
    }

    pub async fn item_id(&self) -> &str {
        &self.item_id
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one((&self.item_id).to_owned()).await?;
        let item = item_option.ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item_id {} for requisition_line_id {}",
                &self.item_id, &self.id
            ))
            .extend(),
        )?;

        Ok(ItemNode::from(item))
    }

    /// Quantity requested
    pub async fn requested_quantity(&self) -> &i32 {
        &self.requested_quantity
    }

    /// Quantity to be supplied in the next shipment, only used in response requisition
    pub async fn supply_quantity(&self) -> &i32 {
        &self.supply_quantity
    }

    /// Calculated quantity
    /// When months_of_stock < requisition.threshold_months_of_stock, calculated = average_monthy_consumption * requisition.max_months_of_stock - months_of_stock
    pub async fn calculated_quantity(&self) -> &i32 {
        &self.calculated_quantity
    }

    /// OutboundShipment lines linked to requisitions line
    pub async fn outbound_shipment_lines(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Connector<InvoiceLineNode>> {
        // Outbound shipments link to response requisition, so for request requisition
        // use linked requisition id
        let requistion_row = &self.requisition_line.requisition_row;
        let requisition_id = match requistion_row.r#type {
            RequisitionRowType::Request => match &requistion_row.linked_requisition_id {
                Some(linked_requisition_id) => linked_requisition_id,
                None => return Ok(Connector::empty()),
            },
            _ => &self.id,
        };

        let loader = ctx.get_loader::<DataLoader<InvoiceLineForRequisitionLine>>();
        let result_option = loader
            .load_one(RequisitionAndItemId {
                requisition_id: requisition_id.clone(),
                item_id: (&self.item_id).clone(),
            })
            .await?;

        let list_result = result_option.unwrap_or(vec![]);

        Ok(list_result.into())
    }

    /// InboundShipment lines linked to requisitions line
    pub async fn inbound_shipment_lines(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Connector<InvoiceLineNode>> {
        // Outbound shipments links to request requisition, so for response requisition
        // use linked requisition id
        let requistion_row = &self.requisition_line.requisition_row;
        let requisition_id = match requistion_row.r#type {
            RequisitionRowType::Response => match &requistion_row.linked_requisition_id {
                Some(linked_requisition_id) => linked_requisition_id,
                None => return Ok(Connector::empty()),
            },
            _ => &self.id,
        };

        let loader = ctx.get_loader::<DataLoader<InvoiceLineForRequisitionLine>>();
        let result_option = loader
            .load_one(RequisitionAndItemId {
                requisition_id: requisition_id.clone(),
                item_id: (&self.item_id).clone(),
            })
            .await?;

        let list_result = result_option.unwrap_or(vec![]);

        Ok(list_result.into())
    }

    /// Snapshot Stats (when requisition was created)
    pub async fn average_monthly_consumption(&self) -> ItemStats {
        ItemStats {
            average_monthly_consumption: *&self.average_monthly_consumption,
            stock_on_hand: *&self.stock_on_hand,
        }
    }

    pub async fn linked_requisition_line_id(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<RequisitionLineNode>> {
        let linked_requisition_id = if let Some(linked_requisition_id) =
            &self.requisition_line.requisition_row.linked_requisition_id
        {
            linked_requisition_id
        } else {
            return Ok(None);
        };

        let loader = ctx.get_loader::<DataLoader<LinkedRequisitionLineLoader>>();
        let result_option = loader
            .load_one(RequisitionAndItemId {
                requisition_id: linked_requisition_id.clone(),
                item_id: (&self.item_id).clone(),
            })
            .await?;

        Ok(result_option.map(RequisitionLineNode::from_domain))
    }
}

impl Deref for RequisitionLineNode {
    type Target = RequisitionLineRow;

    fn deref(&self) -> &Self::Target {
        &self.requisition_line.requisition_line_row
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
