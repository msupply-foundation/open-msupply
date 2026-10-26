#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        StorageConnectionManager, ancillary_item_row::AncillaryItemRow, mock::MockDataInserts,
    };
    use serde_json::json;
    use service::{
        item::{
            ItemServiceTrait,
            ancillary_item::{
                DeleteAncillaryItem, DeleteAncillaryItemError, SetSupplyWastageRate,
                SetSupplyWastageRateError, UpsertAncillaryItem, UpsertAncillaryItemError,
            },
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::AncillaryItemMutations;

    #[derive(Default)]
    struct TestService {
        upsert: Option<
            Box<
                dyn Fn(
                        &ServiceContext,
                        UpsertAncillaryItem,
                    ) -> Result<AncillaryItemRow, UpsertAncillaryItemError>
                    + Sync
                    + Send,
            >,
        >,
        delete: Option<
            Box<
                dyn Fn(
                        &ServiceContext,
                        DeleteAncillaryItem,
                    ) -> Result<String, DeleteAncillaryItemError>
                    + Sync
                    + Send,
            >,
        >,
        set_supply_wastage_rate: Option<
            Box<
                dyn Fn(
                        &ServiceContext,
                        SetSupplyWastageRate,
                    ) -> Result<f64, SetSupplyWastageRateError>
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

        fn set_supply_wastage_rate(
            &self,
            ctx: &ServiceContext,
            input: SetSupplyWastageRate,
        ) -> Result<f64, SetSupplyWastageRateError> {
            (self
                .set_supply_wastage_rate
                .as_ref()
                .expect("set_supply_wastage_rate not stubbed"))(ctx, input)
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
                __typename
                ... on AncillaryItemNode {
                    id
                    itemQuantity
                    ancillaryQuantity
                    excludePrincipalWastage
                    itemId
                    ancillaryItemId
                }
                ... on UpsertAncillaryItemError {
                    error {
                        __typename
                        ... on AncillaryMaxDepthExceeded {
                            max
                            actual
                        }
                    }
                }
            }
        }"#;

        let variables = Some(json!({
            "storeId": "store_a",
            "input": {
                "id": "ai1",
                "itemId": "item_a",
                "ancillaryItemId": "item_b",
                "itemQuantity": 2.0,
                "ancillaryQuantity": 3.0,
                "excludePrincipalWastage": true,
            }
        }));

        // Cycle error → typed AncillaryCycleDetected error variant
        let test_service = TestService {
            upsert: Some(Box::new(|_, _| {
                Err(UpsertAncillaryItemError::CycleDetected)
            })),
            ..Default::default()
        };
        let expected_cycle = json!({
            "upsertAncillaryItem": {
                "__typename": "UpsertAncillaryItemError",
                "error": { "__typename": "AncillaryCycleDetected" }
            }
        });
        assert_graphql_query!(
            &settings,
            &query,
            &variables,
            &expected_cycle,
            Some(service_provider(test_service, &connection_manager))
        );

        // Duplicate → typed DuplicateAncillaryItem error variant
        let test_service = TestService {
            upsert: Some(Box::new(|_, _| {
                Err(UpsertAncillaryItemError::DuplicateAncillaryItem)
            })),
            ..Default::default()
        };
        let expected_duplicate = json!({
            "upsertAncillaryItem": {
                "__typename": "UpsertAncillaryItemError",
                "error": { "__typename": "DuplicateAncillaryItem" }
            }
        });
        assert_graphql_query!(
            &settings,
            &query,
            &variables,
            &expected_duplicate,
            Some(service_provider(test_service, &connection_manager))
        );

        // MaxDepthExceeded → typed AncillaryMaxDepthExceeded error variant with max/actual
        let test_service = TestService {
            upsert: Some(Box::new(|_, _| {
                Err(UpsertAncillaryItemError::MaxDepthExceeded { max: 5, actual: 6 })
            })),
            ..Default::default()
        };
        let expected_max_depth = json!({
            "upsertAncillaryItem": {
                "__typename": "UpsertAncillaryItemError",
                "error": {
                    "__typename": "AncillaryMaxDepthExceeded",
                    "max": 5,
                    "actual": 6
                }
            }
        });
        assert_graphql_query!(
            &settings,
            &query,
            &variables,
            &expected_max_depth,
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
                    item_id: input.item_id,
                    ancillary_item_id: input.ancillary_item_id,
                    item_quantity: input.item_quantity,
                    ancillary_quantity: input.ancillary_quantity,
                    deleted_datetime: None,
                    exclude_principal_wastage: input.exclude_principal_wastage.unwrap_or(false),
                    wastage_rate: 0.0,
                })
            })),
            ..Default::default()
        };
        let expected = json!({
            "upsertAncillaryItem": {
                "id": "ai1",
                "itemQuantity": 2.0,
                "ancillaryQuantity": 3.0,
                "excludePrincipalWastage": true,
                "itemId": "item_a",
                "ancillaryItemId": "item_b",
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

    #[actix_rt::test]
    async fn test_graphql_set_supply_wastage_rate() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            AncillaryItemMutations,
            "omsupply-database-gql-set-supply-wastage-rate",
            MockDataInserts::none(),
        )
        .await;

        let query = r#"mutation SetSupplyWastageRate($storeId: String!, $input: SetSupplyWastageRateInput!) {
            setSupplyWastageRate(storeId: $storeId, input: $input) {
                __typename
                ... on SupplyWastageRateNode {
                    itemId
                    wastageRate
                }
                ... on SetSupplyWastageRateError {
                    error {
                        __typename
                    }
                }
            }
        }"#;

        let variables = Some(json!({
            "storeId": "store_a",
            "input": { "itemId": "item_a", "wastageRate": 10.0 }
        }));

        // RateOutOfRange → typed SupplyWastageRateOutOfRange error variant
        let test_service = TestService {
            set_supply_wastage_rate: Some(Box::new(|_, _| {
                Err(SetSupplyWastageRateError::RateOutOfRange)
            })),
            ..Default::default()
        };
        let expected_out_of_range = json!({
            "setSupplyWastageRate": {
                "__typename": "SetSupplyWastageRateError",
                "error": { "__typename": "SupplyWastageRateOutOfRange" }
            }
        });
        assert_graphql_query!(
            &settings,
            &query,
            &variables,
            &expected_out_of_range,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotCentralServer → "Forbidden"
        let test_service = TestService {
            set_supply_wastage_rate: Some(Box::new(|_, _| {
                Err(SetSupplyWastageRateError::NotCentralServer)
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
            set_supply_wastage_rate: Some(Box::new(|_, input| Ok(input.wastage_rate))),
            ..Default::default()
        };
        let expected = json!({
            "setSupplyWastageRate": {
                "__typename": "SupplyWastageRateNode",
                "itemId": "item_a",
                "wastageRate": 10.0
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
}
