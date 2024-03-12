use async_graphql::{dataloader::DataLoader, Context, ErrorExtensions, Object, Result};
use chrono::NaiveDate;
use graphql_core::{
    loader::{NameByIdLoader, NameByIdLoaderInput},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{Store, StoreRow};

use super::NameNode;

#[derive(PartialEq, Debug)]
pub struct StoreNode {
    store: Store,
}

#[Object]
impl StoreNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn store_name(&self) -> &str {
        &self.store.name_row.name
    }

    pub async fn name(&self, ctx: &Context<'_>, store_id: String) -> Result<NameNode> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        let response_option = loader
            .load_one(NameByIdLoaderInput::new(&store_id, &self.row().name_id))
            .await?;

        response_option.map(NameNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find name ({}) linked to store ({})",
                &self.row().name_id,
                &self.row().id
            ))
            .extend(),
        )
    }

    pub async fn site_id(&self) -> i32 {
        self.row().site_id
    }
    /// Returns the associated store logo.
    /// The logo is returned as a data URL schema, e.g. "data:image/png;base64,..."
    pub async fn logo(&self) -> &Option<String> {
        &self.row().logo
    }

    pub async fn created_date(&self) -> Option<NaiveDate> {
        self.row().created_date
    }
}

impl StoreNode {
    pub fn from_domain(store: Store) -> StoreNode {
        StoreNode { store }
    }

    pub fn row(&self) -> &StoreRow {
        &self.store.store_row
    }
}

#[cfg(test)]
mod test {
    use async_graphql::{EmptyMutation, Object};
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test_with_data};
    use repository::{
        mock::{MockData, MockDataInserts},
        NameRow, Store, StoreRow,
    };
    use serde_json::json;
    use util::inline_init;

    use crate::types::StoreNode;

    #[actix_rt::test]
    async fn graphql_test_store_loader() {
        #[derive(Clone)]
        struct TestQuery;

        fn name() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "name_id".to_string();
                r.name = "name".to_string()
            })
        }

        fn store() -> StoreRow {
            inline_init(|r: &mut StoreRow| {
                r.id = "store".to_string();
                r.name_id = name().id
            })
        }

        let (_, _, _, settings) = setup_graphl_test_with_data(
            TestQuery,
            EmptyMutation,
            "graphql_test_store_loader",
            MockDataInserts::none(),
            inline_init(|r: &mut MockData| {
                r.stores = vec![store()];
                r.names = vec![name()];
            }),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query(&self) -> StoreNode {
                StoreNode {
                    store: Store {
                        store_row: store(),
                        name_row: name(),
                    },
                }
            }
        }

        let expected = json!({
            "testQuery": {
                "__typename": "StoreNode",
                "storeName": name().name,
                "name": {
                    "id": name().id
                }
            }
        }
        );

        let query = r#"
        query($storeId: String) {
            testQuery {
                __typename
                storeName
                name(storeId: $storeId) {
                    id
                }
            }
        }
        "#;

        let variables = json!({
            "storeId": store().id
        });

        assert_graphql_query!(&settings, &query, &Some(variables), expected, None);
    }
}
