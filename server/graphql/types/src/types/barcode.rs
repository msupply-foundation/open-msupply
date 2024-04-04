use async_graphql::*;
use graphql_core::simple_generic_errors::InternalError;
use repository::{barcode::Barcode, BarcodeRow};
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct BarcodeNode {
    barcode: Barcode,
}

#[derive(SimpleObject)]
pub struct BarcodeConnector {
    total_count: u32,
    nodes: Vec<BarcodeNode>,
}

#[Object]
impl BarcodeNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn gtin(&self) -> &str {
        &self.row().gtin
    }

    pub async fn item_id(&self) -> &str {
        &self.row().item_id
    }

    pub async fn manufacturer_id(&self) -> Option<String> {
        self.barcode
            .manufacturer_name_row
            .as_ref()
            .map(|it| it.id.clone())
    }

    pub async fn pack_size(&self) -> Option<i32> {
        self.row().pack_size
    }

    pub async fn parent_id(&self) -> Option<String> {
        self.row().parent_id.clone()
    }
}

#[derive(Union)]
pub enum BarcodeResponseError {
    InternalError(InternalError),
}

#[derive(SimpleObject)]
pub struct BarcodeError {
    pub error: BarcodeResponseError,
}

#[derive(Union)]
pub enum BarcodeResponse {
    Error(BarcodeError),
    Response(BarcodeNode),
}

impl BarcodeNode {
    pub fn from_domain(barcode: Barcode) -> BarcodeNode {
        BarcodeNode { barcode }
    }

    pub fn row(&self) -> &BarcodeRow {
        &self.barcode.barcode_row
    }
}

impl BarcodeConnector {
    pub fn from_domain(barcodes: ListResult<Barcode>) -> BarcodeConnector {
        BarcodeConnector {
            total_count: barcodes.count,
            nodes: barcodes
                .rows
                .into_iter()
                .map(BarcodeNode::from_domain)
                .collect(),
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::Object;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;
    use util::inline_init;

    use super::*;

    #[actix_rt::test]
    async fn graphq_test_barcode_node_details() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphl_test(
            TestQuery,
            EmptyMutation,
            "graphq_test_barcode_node_details",
            MockDataInserts::none(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query(&self) -> BarcodeNode {
                BarcodeNode {
                    barcode: Barcode {
                        barcode_row: {
                            inline_init(|r: &mut BarcodeRow| {
                                r.id = "CB81F6CD62C1476F9411362053D49E84".to_string();
                                r.gtin = "0123456789".to_string();
                                r.item_id = "AA460A207402434A89B1F6EEAC08DA43".to_string();
                                r.pack_size = Some(1);
                            })
                        },
                        manufacturer_name_row: None,
                    },
                }
            }
        }

        let expected = json!({
            "testQuery": {
                "__typename": "BarcodeNode",
                "id": "CB81F6CD62C1476F9411362053D49E84",
                "gtin": "0123456789",
                "itemId": "AA460A207402434A89B1F6EEAC08DA43",
                "packSize": 1
            }
          }
        );

        let query = r#"
        query {
            testQuery {
                __typename
               id
               gtin
               itemId
               packSize
            }
        }
        "#;
        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
}
