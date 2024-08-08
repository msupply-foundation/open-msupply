use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDate;
use graphql_core::{loader::ItemLoader, standard_graphql_error::StandardGraphqlError, ContextExt};
use repository::{ItemRow, StockLineRow};
use service::{
    invoice::supplier_return::generate_outbound_return_lines::OutboundReturnLine, ListResult,
};

use super::ItemNode;

#[derive(SimpleObject)]
pub struct OutboundReturnLineConnector {
    total_count: u32,
    nodes: Vec<OutboundReturnLineNode>,
}

impl OutboundReturnLineConnector {
    pub fn from_domain(
        return_lines: ListResult<OutboundReturnLine>,
    ) -> OutboundReturnLineConnector {
        OutboundReturnLineConnector {
            total_count: return_lines.count,
            nodes: return_lines
                .rows
                .into_iter()
                .map(OutboundReturnLineNode::from_domain)
                .collect(),
        }
    }
}

pub struct OutboundReturnLineNode {
    pub return_line: OutboundReturnLine,
}

impl OutboundReturnLineNode {
    pub fn from_domain(return_line: OutboundReturnLine) -> OutboundReturnLineNode {
        OutboundReturnLineNode { return_line }
    }

    pub fn item_row(&self) -> &ItemRow {
        &self.return_line.stock_line.item_row
    }

    pub fn stock_line_row(&self) -> &StockLineRow {
        &self.return_line.stock_line.stock_line_row
    }
}

#[Object]
impl OutboundReturnLineNode {
    pub async fn id(&self) -> &str {
        &self.return_line.id
    }

    pub async fn note(&self) -> &Option<String> {
        &self.return_line.note
    }

    pub async fn reason_id(&self) -> &Option<String> {
        &self.return_line.reason_id
    }

    pub async fn number_of_packs_to_return(&self) -> &f64 {
        &self.return_line.number_of_packs
    }

    // TODO should ideally come from invoice line
    pub async fn item_code(&self) -> &str {
        &self.item_row().code
    }
    // TODO should ideally come from invoice line
    pub async fn item_name(&self) -> &str {
        &self.item_row().name
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.item_row().id.clone()).await?;

        let item = item_option.ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item {} for invoice line {}",
                self.item_row().id,
                self.return_line.id
            ))
            .extend(),
        )?;

        Ok(ItemNode::from_domain(item))
    }

    pub async fn stock_line_id(&self) -> &str {
        &self.stock_line_row().id
    }

    pub async fn batch(&self) -> &Option<String> {
        &self.stock_line_row().batch
    }

    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.stock_line_row().expiry_date
    }

    pub async fn available_number_of_packs(&self) -> f64 {
        self.return_line.available_number_of_packs
    }

    pub async fn pack_size(&self) -> f64 {
        self.stock_line_row().pack_size
    }
}
