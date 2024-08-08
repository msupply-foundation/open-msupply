use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDate;
use graphql_core::{loader::ItemLoader, standard_graphql_error::StandardGraphqlError, ContextExt};
use repository::ItemRow;
use service::{invoice::customer_return::generate_lines::CustomerReturnLine, ListResult};

use super::ItemNode;

#[derive(SimpleObject)]
pub struct GeneratedCustomerReturnLineConnector {
    total_count: u32,
    nodes: Vec<CustomerReturnLineNode>,
}

impl GeneratedCustomerReturnLineConnector {
    pub fn from_domain(
        return_lines: ListResult<CustomerReturnLine>,
    ) -> GeneratedCustomerReturnLineConnector {
        GeneratedCustomerReturnLineConnector {
            total_count: return_lines.count,
            nodes: return_lines
                .rows
                .into_iter()
                .map(CustomerReturnLineNode::from_domain)
                .collect(),
        }
    }
}

pub struct CustomerReturnLineNode {
    pub return_line: CustomerReturnLine,
}

impl CustomerReturnLineNode {
    pub fn from_domain(return_line: CustomerReturnLine) -> CustomerReturnLineNode {
        CustomerReturnLineNode { return_line }
    }

    pub fn item_row(&self) -> &ItemRow {
        &self.return_line.item_row
    }
}

#[Object]
impl CustomerReturnLineNode {
    pub async fn id(&self) -> &str {
        &self.return_line.id
    }

    pub async fn note(&self) -> &Option<String> {
        &self.return_line.note
    }

    pub async fn reason_id(&self) -> &Option<String> {
        &self.return_line.reason_id
    }

    pub async fn number_of_packs_returned(&self) -> &f64 {
        &self.return_line.number_of_packs
    }

    pub async fn number_of_packs_issued(&self) -> &Option<f64> {
        &self.return_line.packs_issued
    }

    pub async fn stock_line_id(&self) -> &Option<String> {
        &self.return_line.stock_line_id
    }

    pub async fn batch(&self) -> &Option<String> {
        &self.return_line.batch
    }

    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.return_line.expiry_date
    }

    pub async fn pack_size(&self) -> f64 {
        self.return_line.pack_size
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
}
