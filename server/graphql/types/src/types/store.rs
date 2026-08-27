use super::NameNode;
use async_graphql::{dataloader::DataLoader, Context, ErrorExtensions, Object, Result};
use chrono::NaiveDate;
use graphql_core::{
    loader::{NameByIdLoader, NameByIdLoaderInput, StoreLogoLoader},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{NameRow, Store, StoreRow};

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
            .load_one(NameByIdLoaderInput::new(&store_id, &self.name_row().id))
            .await?;

        response_option.map(NameNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find name ({}) linked to store ({})",
                &self.name_row().id,
                &self.row().id
            ))
            .extend(),
        )
    }

    pub async fn site_id(&self) -> i32 {
        self.row().site_id
    }

    /// Whether the store has been disabled, either by a user or as a result of a store merge.
    pub async fn is_disabled(&self) -> bool {
        self.row().is_disabled
    }
    /// Returns the associated store logo, falling back to the global logo
    /// preference when the store has none.
    /// The logo is returned as a data URL schema, e.g. "data:image/png;base64,..."
    /// Lazy-loaded — the logo is not pulled with the default store row.
    pub async fn logo(&self, ctx: &Context<'_>) -> Result<Option<String>> {
        let loader = ctx.get_loader::<DataLoader<StoreLogoLoader>>();
        let row = loader.load_one(self.row().id.clone()).await?;
        Ok(row.and_then(|r| r.logo))
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

    pub fn name_row(&self) -> &NameRow {
        &self.store.name_row
    }
}

#[cfg(test)]
mod test {
    use async_graphql::{EmptyMutation, Object};
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test_with_data};
    use repository::{
        mock::{MockData, MockDataInserts},
        NameRow, PreferenceRow, Store, StoreRow, StoreRowRepository,
    };
    use serde_json::json;

    use crate::types::StoreNode;

    #[actix_rt::test]
    async fn graphql_test_store_loader() {
        #[derive(Clone)]
        struct TestQuery;

        fn name() -> NameRow {
            NameRow {
                id: "name_id".to_string(),
                name: "name".to_string(),
                ..Default::default()
            }
        }

        fn store() -> StoreRow {
            StoreRow {
                id: "store".to_string(),
                name_id: name().id,
                ..Default::default()
            }
        }

        let (_, _, _, settings) = setup_graphql_test_with_data(
            TestQuery,
            EmptyMutation,
            "graphql_test_store_loader",
            MockDataInserts::none(),
            MockData {
                stores: vec![store()],
                names: vec![name()],
                ..Default::default()
            },
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
                // No store logo and no global logo preference
                "logo": null,
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
                logo
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

    #[actix_rt::test]
    async fn graphql_test_store_logo_global_fallback() {
        #[derive(Clone)]
        struct TestQuery;

        const OWN_LOGO: &str = "data:image/png;base64,own";
        const GLOBAL_LOGO: &str = "data:image/png;base64,global";

        fn name() -> NameRow {
            NameRow {
                id: "name_id".to_string(),
                name: "name".to_string(),
                ..Default::default()
            }
        }

        fn store_with_logo() -> StoreRow {
            StoreRow {
                id: "store_with_logo".to_string(),
                name_id: name().id,
                ..Default::default()
            }
        }

        fn store_without_logo() -> StoreRow {
            StoreRow {
                id: "store_without_logo".to_string(),
                name_id: name().id,
                ..Default::default()
            }
        }

        let (_, connection, _, settings) = setup_graphql_test_with_data(
            TestQuery,
            EmptyMutation,
            "graphql_test_store_logo_global_fallback",
            MockDataInserts::none(),
            MockData {
                stores: vec![store_with_logo(), store_without_logo()],
                names: vec![name()],
                preferences: vec![PreferenceRow {
                    id: "global_logo_global".to_string(),
                    key: "global_logo".to_string(),
                    value: serde_json::to_string(GLOBAL_LOGO).unwrap(),
                    store_id: None,
                }],
                ..Default::default()
            },
        )
        .await;

        StoreRowRepository::new(&connection)
            .update_logo(&store_with_logo().id, Some(OWN_LOGO))
            .unwrap();

        #[Object]
        impl TestQuery {
            pub async fn with_logo(&self) -> StoreNode {
                StoreNode {
                    store: Store {
                        store_row: store_with_logo(),
                        name_row: name(),
                    },
                }
            }

            pub async fn without_logo(&self) -> StoreNode {
                StoreNode {
                    store: Store {
                        store_row: store_without_logo(),
                        name_row: name(),
                    },
                }
            }
        }

        let expected = json!({
            // A store's own logo wins over the global one
            "withLogo": { "logo": OWN_LOGO },
            // A store without a logo falls back to the global logo preference
            "withoutLogo": { "logo": GLOBAL_LOGO }
        });

        let query = r#"
        query {
            withLogo { logo }
            withoutLogo { logo }
        }
        "#;

        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
}
