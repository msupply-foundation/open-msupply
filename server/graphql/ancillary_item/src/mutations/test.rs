#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        ancillary_item_row::AncillaryItemRow, mock::MockDataInserts, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        item::{
            ancillary_item::{
                DeleteAncillaryItem, DeleteAncillaryItemError, UpsertAncillaryItem,
                UpsertAncillaryItemError,
            },
            ItemServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::AncillaryItemMutations;

    #[derive(Default)]
    struct TestService {
        upsert: Option<
            Box<
                dyn Fn(&ServiceContext, UpsertAncillaryItem) -> Result<AncillaryItemRow, UpsertAncillaryItemError>
                    + Sync
                    + Send,
            >,
        >,
        delete: Option<
            Box<
                dyn Fn(&ServiceContext, DeleteAncillaryItem) -> Result<String, DeleteAncillaryItemError>
                    + Sync
                    + Send,
            >,
        >,
    }

    impl ItemServiceTrait for TestService {
        fn upsert_ancillary_item(
            &self,
            ctx: &ServiceContext,
            input: UpsertAncillaryItem,
        ) -> Result<AncillaryItemRow, UpsertAncillaryItemError> {
            (self.upsert.as_ref().expect("upsert not stubbed"))(ctx, input)
        }

        fn delete_ancillary_item(
            &self,
            ctx: &ServiceContext,
            input: DeleteAncillaryItem,
        ) -> Result<String, DeleteAncillaryItemError> {
            (self.delete.as_ref().expect("delete not stubbed"))(ctx, input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.item_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_upsert_ancillary_item() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            AncillaryItemMutations,
            "omsupply-database-gql-upsert-ancillary-item",
            MockDataInserts::none(),
        )
        .await;

        let query = r#"mutation UpsertAncillaryItem($storeId: String!, $input: UpsertAncillaryItemInput!) {
            upsertAncillaryItem(storeId: $storeId, input: $input) {
                ... on AncillaryItemNode {
                    id
                    itemQuantity
                    ancillaryQuantity
                    itemLinkId
                    ancillaryItemLinkId
                }
            }
        }"#;

        let variables = Some(json!({
            "storeId": "store_a",
            "input": {
                "id": "ai1",
                "itemLinkId": "item_a",
                "ancillaryItemLinkId": "item_b",
                "itemQuantity": 2.0,
                "ancillaryQuantity": 3.0,
            }
        }));

        // Cycle error → "Bad user input"
        let test_service = TestService {
            upsert: Some(Box::new(|_, _| Err(UpsertAncillaryItemError::CycleDetected))),
            ..Default::default()
        };
        assert_standard_graphql_error!(
            &settings,
            &query,
            &variables,
            "Bad user input",
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotCentralServer → "Forbidden"
        let test_service = TestService {
            upsert: Some(Box::new(|_, _| {
                Err(UpsertAncillaryItemError::NotCentralServer)
            })),
            ..Default::default()
        };
        assert_standard_graphql_error!(
            &settings,
            &query,
            &variables,
            "Forbidden",
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // Success
        let test_service = TestService {
            upsert: Some(Box::new(|_, input| {
                Ok(AncillaryItemRow {
                    id: input.id,
                    item_link_id: input.item_link_id,
                    ancillary_item_link_id: input.ancillary_item_link_id,
                    item_quantity: input.item_quantity,
                    ancillary_quantity: input.ancillary_quantity,
                    deleted_datetime: None,
                })
            })),
            ..Default::default()
        };
        let expected = json!({
            "upsertAncillaryItem": {
                "id": "ai1",
                "itemQuantity": 2.0,
                "ancillaryQuantity": 3.0,
                "itemLinkId": "item_a",
                "ancillaryItemLinkId": "item_b",
            }
        });
        assert_graphql_query!(
            &settings,
            &query,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_delete_ancillary_item() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            AncillaryItemMutations,
            "omsupply-database-gql-delete-ancillary-item",
            MockDataInserts::none(),
        )
        .await;

        let query = r#"mutation DeleteAncillaryItem($storeId: String!, $input: DeleteAncillaryItemInput!) {
            deleteAncillaryItem(storeId: $storeId, input: $input) {
                ... on DeleteResponse {
                    id
                }
            }
        }"#;

        let variables = Some(json!({
            "storeId": "store_a",
            "input": { "id": "ai1" }
        }));

        // Success
        let test_service = TestService {
            delete: Some(Box::new(|_, input| Ok(input.id))),
            ..Default::default()
        };
        let expected = json!({ "deleteAncillaryItem": { "id": "ai1" } });
        assert_graphql_query!(
            &settings,
            &query,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotCentralServer → "Forbidden"
        let test_service = TestService {
            delete: Some(Box::new(|_, _| {
                Err(DeleteAncillaryItemError::NotCentralServer)
            })),
            ..Default::default()
        };
        assert_standard_graphql_error!(
            &settings,
            &query,
            &variables,
            "Forbidden",
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
