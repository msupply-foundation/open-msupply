use async_graphql::*;
use graphql_core::simple_generic_errors::InternalError;
use repository::{item_direction::ItemDirection, ItemDirectionRow};
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct ItemDirectionNode {
    item_direction: ItemDirection,
}

#[derive(SimpleObject)]
pub struct ItemDirectionConnector {
    total_count: u32,
    nodes: Vec<ItemDirectionNode>,
}

#[Object]
impl ItemDirectionNode {
    pub async fn id(&self) -> &str {
        &self.item_direction.item_direction_row.id
    }

    pub async fn item_id(&self) -> &str {
        &self.item_direction.item_row.id
    }

    pub async fn directions(&self) -> &str {
        &self.item_direction.item_direction_row.directions
    }

    pub async fn priority(&self) -> i64 {
        self.item_direction.item_direction_row.priority
    }
}

#[derive(Union)]
pub enum ItemDirectionResponseError {
    InternalError(InternalError),
}

#[derive(SimpleObject)]
pub struct ItemDirectionError {
    pub error: ItemDirectionResponseError,
}

#[derive(Union)]
pub enum ItemDirectionResponse {
    Error(ItemDirectionError),
    Response(ItemDirectionNode),
}

impl ItemDirectionNode {
    pub fn from_domain(item_direction: ItemDirection) -> ItemDirectionNode {
        ItemDirectionNode { item_direction }
    }

    pub fn from_vec(item_directions: Vec<ItemDirection>) -> Vec<ItemDirectionNode> {
        item_directions
            .into_iter()
            .map(ItemDirectionNode::from_domain)
            .collect()
    }

    pub fn row(&self) -> &ItemDirectionRow {
        &self.item_direction.item_direction_row
    }
}

impl ItemDirectionConnector {
    pub fn from_domain(item_directions: ListResult<ItemDirection>) -> ItemDirectionConnector {
        ItemDirectionConnector {
            total_count: item_directions.count,
            nodes: item_directions
                .rows
                .into_iter()
                .map(ItemDirectionNode::from_domain)
                .collect(),
        }
    }
}
