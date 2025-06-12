use async_graphql::*;
use chrono::NaiveDate;
use repository::PurchaseOrderLineRow;
use service::usize_to_u32;

#[derive(PartialEq, Debug)]
pub struct PurchaseOrderLineNode {
    pub purchase_order_line: PurchaseOrderLineRow,
}

#[derive(SimpleObject)]
pub struct PurchaseOrderLineConnector {
    pub total_count: u32,
    pub nodes: Vec<PurchaseOrderLineNode>,
}

#[Object]
impl PurchaseOrderLineNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn item_code(&self) -> &str {
        &self.row().item_code
    }
    pub async fn item_name(&self) -> &Option<String> {
        &self.row().item_name
    }
    pub async fn number_of_packs(&self) -> &Option<f64> {
        &self.row().number_of_packs
    }
    pub async fn pack_size(&self) -> &Option<f64> {
        &self.row().pack_size
    }
    pub async fn original_quantity(&self) -> &Option<f64> {
        &self.row().original_quantity
    }
    pub async fn adjusted_quantity(&self) -> &Option<f64> {
        &self.row().adjusted_quantity
    }
    pub async fn total_received(&self) -> &Option<f64> {
        &self.row().total_received
    }
    pub async fn requested_delivery_date(&self) -> &Option<NaiveDate> {
        &self.row().requested_delivery_date
    }
    pub async fn expected_delivery_date(&self) -> &Option<NaiveDate> {
        &self.row().expected_delivery_date
    }
}

impl PurchaseOrderLineNode {
    pub fn from_domain(purchase_order_line: PurchaseOrderLineRow) -> PurchaseOrderLineNode {
        PurchaseOrderLineNode {
            purchase_order_line,
        }
    }
}

impl PurchaseOrderLineConnector {
    pub fn from_vec(purchase_order_lines: Vec<PurchaseOrderLineRow>) -> PurchaseOrderLineConnector {
        PurchaseOrderLineConnector {
            total_count: usize_to_u32(purchase_order_lines.len()),
            nodes: purchase_order_lines
                .into_iter()
                .map(PurchaseOrderLineNode::from_domain)
                .collect(),
        }
    }
}

impl PurchaseOrderLineNode {
    pub fn row(&self) -> &PurchaseOrderLineRow {
        &self.purchase_order_line
    }
}
