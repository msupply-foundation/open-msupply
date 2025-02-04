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

// #[cfg(test)]
// mod test {
//     use async_graphql::Object;
//     use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
//     use repository::mock::MockDataInserts;
//     use serde_json::json;

//     use super::*;

//     #[actix_rt::test]
//     async fn graphql_test_item_direction_node_details() {
//         #[derive(Clone)]
//         struct TestQuery;

//         let (_, _, _, settings) = setup_graphql_test(
//             TestQuery,
//             EmptyMutation,
//             "graphql_test_item_direction_node_details",
//             MockDataInserts::none(),
//         )
//         .await;

//         #[Object]
//         impl TestQuery {
//             pub async fn test_query(&self) -> ItemDirectionNode {
//                 ItemDirectionNode {
//                     item_direction: ItemDirection {
//                         id: "the_id".to_string(),
//                         item_link_id: "the_item_link_id".to_string(),
//                         directions: "the_directions".to_string(),
//                         priority: 0,
//                     },
//                 }
//             }
//         }

//         let expected = json!({
//             "testQuery": {
//                 "__typename": "ItemDirectionNode",
//                 "id": "the_id",
//                 "item_link_id": "the_item_link_id",
//                 "directions": "the_directions",
//                 "priority": 0
//             }
//           }
//         );

//         let query = r#"
//         query {
//             testQuery {
//                 __typename
//                id
//                itemLinkId
//                directions
//                priority
//             }
//         }
//         "#;
//         assert_graphql_query!(&settings, &query, &None, expected, None);
//     }
// }
