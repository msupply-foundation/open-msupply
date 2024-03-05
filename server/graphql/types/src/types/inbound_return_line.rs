use async_graphql::*;
use chrono::NaiveDate;
use repository::{ItemRow, StockLineRow};
use service::{invoice::inbound_return::generate_lines::InboundReturnLine, ListResult};

#[derive(SimpleObject)]
pub struct InboundReturnLineConnector {
    total_count: u32,
    nodes: Vec<InboundReturnLineNode>,
}

impl InboundReturnLineConnector {
    pub fn from_domain(return_lines: ListResult<InboundReturnLine>) -> InboundReturnLineConnector {
        InboundReturnLineConnector {
            total_count: return_lines.count,
            nodes: return_lines
                .rows
                .into_iter()
                .map(InboundReturnLineNode::from_domain)
                .collect(),
        }
    }
}

pub struct InboundReturnLineNode {
    pub return_line: InboundReturnLine,
}

impl InboundReturnLineNode {
    pub fn from_domain(return_line: InboundReturnLine) -> InboundReturnLineNode {
        InboundReturnLineNode { return_line }
    }

    pub fn item_row(&self) -> &ItemRow {
        &self.return_line.item_row
    }

    pub fn stock_line_row(&self) -> &StockLineRow {
        &self.return_line.stock_line_row
    }
}

#[Object]
impl InboundReturnLineNode {
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

    pub async fn item_code(&self) -> &str {
        &self.item_row().code
    }

    pub async fn item_name(&self) -> &str {
        &self.item_row().name
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

    // pub async fn available_number_of_packs(&self) -> &f64 {
    //     &self.stock_line_row().available_number_of_packs
    // }

    pub async fn pack_size(&self) -> &i32 {
        &self.stock_line_row().pack_size
    }
}
