use async_graphql::*;
use chrono::NaiveDate;
use repository::ItemRow;
use service::{invoice::inbound_return::generate_lines::InboundReturnLine, ListResult};

#[derive(SimpleObject)]
pub struct GeneratedInboundReturnLineConnector {
    total_count: u32,
    nodes: Vec<GeneratedInboundReturnLineNode>,
}

impl GeneratedInboundReturnLineConnector {
    pub fn from_domain(
        return_lines: ListResult<InboundReturnLine>,
    ) -> GeneratedInboundReturnLineConnector {
        GeneratedInboundReturnLineConnector {
            total_count: return_lines.count,
            nodes: return_lines
                .rows
                .into_iter()
                .map(GeneratedInboundReturnLineNode::from_domain)
                .collect(),
        }
    }
}

pub struct GeneratedInboundReturnLineNode {
    pub return_line: InboundReturnLine,
}

impl GeneratedInboundReturnLineNode {
    pub fn from_domain(return_line: InboundReturnLine) -> GeneratedInboundReturnLineNode {
        GeneratedInboundReturnLineNode { return_line }
    }

    pub fn item_row(&self) -> &ItemRow {
        &self.return_line.item_row
    }
}

#[Object]
impl GeneratedInboundReturnLineNode {
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

    pub async fn pack_size(&self) -> &i32 {
        &self.return_line.pack_size
    }

    pub async fn item_id(&self) -> &str {
        &self.item_row().id
    }

    pub async fn item_code(&self) -> &str {
        &self.item_row().code
    }

    pub async fn item_name(&self) -> &str {
        &self.item_row().name
    }
}
