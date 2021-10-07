use async_graphql::*;
use chrono::NaiveDate;
use dataloader::DataLoader;

use crate::{
    database::{loader::InvoiceLineQueryLoader, repository::InvoiceLineQueryJoin},
    server::service::graphql::ContextExt,
};

#[derive(PartialEq, Debug)]
struct InvoiceLines {
    invoice_id: String,
}

#[Object]
impl InvoiceLines {
    async fn nodes(&self, ctx: &Context<'_>) -> Vec<InvoiceLineNode> {
        let loader = ctx.get_loader::<DataLoader<InvoiceLineQueryLoader>>();

        let lines = loader
            .load_one(self.invoice_id.to_string())
            .await
            // TODO handle error:
            .unwrap()
            .map_or(Vec::new(), |v| v);
        lines.into_iter().map(InvoiceLineNode::from).collect()
    }
}

#[derive(SimpleObject, PartialEq, Debug)]
#[graphql(name = "InvoiceQueryLineNode")]
pub struct InvoiceLineNode {
    id: String,
    item_id: String,
    item_name: String,
    item_code: String,
    pack_size: i32,
    number_of_packs: i32,
    cost_price_per_pack: f64,
    sell_price_per_pack: f64,
    batch: Option<String>,
    expiry_date: Option<NaiveDate>,
    stock_line: StockLine,
}

impl From<InvoiceLineQueryJoin> for InvoiceLineNode {
    fn from((invoice_line, item, stock_line): InvoiceLineQueryJoin) -> Self {
        // TODO: is that correct:
        let invoice_number_of_packs = invoice_line.available_number_of_packs;
        InvoiceLineNode {
            id: invoice_line.id,
            item_id: item.id,
            item_name: item.name,
            item_code: item.code,
            pack_size: invoice_line.pack_size,
            number_of_packs: invoice_number_of_packs,
            cost_price_per_pack: invoice_line.cost_price_per_pack,
            sell_price_per_pack: invoice_line.sell_price_per_pack,
            batch: invoice_line.batch,
            expiry_date: invoice_line.expiry_date,
            // TODO resolve stock_line on demand:
            stock_line: StockLine {
                available_number_of_packs: stock_line.available_number_of_packs
                    + invoice_number_of_packs,
            },
        }
    }
}

#[derive(SimpleObject, PartialEq, Debug)]
pub struct StockLine {
    /// number of pack available for a batch ("includes" numberOfPacks in this line)
    available_number_of_packs: i32,
}
