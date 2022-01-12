mod graphql {
    use crate::graphql::assert_graphql_query;
    use chrono::NaiveDate;
    use repository::{
        mock::MockDataInserts,
        schema::{StockTakeRow, StockTakeStatus},
        StockTake, StorageConnectionManager,
    };
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stock_take::{
            insert::{InsertStockTakeError, InsertStockTakeInput},
            StockTakeServiceTrait,
        },
    };

    type ServiceMethod = dyn Fn(&ServiceContext, &str, InsertStockTakeInput) -> Result<StockTake, InsertStockTakeError>
        + Sync
        + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StockTakeServiceTrait for TestService {
        fn insert_stock_take(
            &self,
            ctx: &ServiceContext,
            store_id: &str,
            input: InsertStockTakeInput,
        ) -> Result<StockTake, InsertStockTakeError> {
            (self.0)(ctx, store_id, input)
        }
    }

    pub fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.stock_take_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_stock_take_insert() {
        let (_, _, connection_manager, settings) = setup_all(
            "omsupply-database-gql-stock_take_insert",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation InsertStockTake($storeId: String, $input: InsertStockTakeInput!) {
            insertStockTake(storeId: $storeId, input: $input) {
                ... on StockTakeNode {                    
                        id
                        storeId
                        stockTakeNumber
                        comment
                        description
                        status
                        createdDatetime
                        finalisedDatetime
                        inventoryAdjustmentId
                }
            }
        }"#;

        // success
        let test_service = TestService(Box::new(|_, _, _| {
            Ok(StockTakeRow {
                id: "id1".to_string(),
                stock_take_number: 123,
                store_id: "store id".to_string(),
                comment: Some("comment".to_string()),
                description: Some("description".to_string()),
                status: StockTakeStatus::Finalised,
                created_datetime: NaiveDate::from_ymd(2022, 1, 22).and_hms(15, 16, 0),
                finalised_datetime: Some(NaiveDate::from_ymd(2022, 1, 23).and_hms(15, 16, 0)),
                inventory_adjustment_id: Some("inv id".to_string()),
            })
        }));
        let variables = Some(json!({
            "storeId": "store id",
            "input": {
                "id": "id1",
                "comment": "comment",
                "description": "description",
                "createdDatetime": "2022-01-22T15:16:00",
            }
        }));
        let expected = json!({
            "insertStockTake": {
              "id": "id1",
              "storeId": "store id",
              "stockTakeNumber": 123,
              "comment": "comment",
              "description": "description",
              "status": "FINALISED",
              "createdDatetime": "2022-01-22T15:16:00",
              "finalisedDatetime": "2022-01-23T15:16:00",
              "inventoryAdjustmentId": "inv id",
            }
          }
        );
        assert_graphql_query!(
            &settings,
            query,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
