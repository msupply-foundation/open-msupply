use async_graphql::*;
use chrono::NaiveDateTime;
use repository::{shipping_method::ShippingMethod, shipping_method_row::ShippingMethodRow};
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct ShippingMethodNode {
    pub shipping_method: ShippingMethodRow,
}

#[Object]
impl ShippingMethodNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn method(&self) -> &str {
        &self.row().method
    }

    pub async fn deleted_datetime(&self) -> &Option<NaiveDateTime> {
        &self.row().deleted_datetime
    }
}

impl ShippingMethodNode {
    pub fn from_domain(shipping_method: ShippingMethodRow) -> ShippingMethodNode {
        ShippingMethodNode { shipping_method }
    }

    pub fn row(&self) -> &ShippingMethodRow {
        &self.shipping_method
    }
}

#[derive(SimpleObject)]
pub struct ShippingMethodConnector {
    total_count: u32,
    nodes: Vec<ShippingMethodNode>,
}

impl ShippingMethodConnector {
    pub fn from_domain(shipping_methods: ListResult<ShippingMethod>) -> ShippingMethodConnector {
        ShippingMethodConnector {
            total_count: shipping_methods.count,
            nodes: shipping_methods
                .rows
                .into_iter()
                .map(ShippingMethodNode::from_domain)
                .collect(),
        }
    }
}
