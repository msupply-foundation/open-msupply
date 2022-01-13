mod graphql {
    use crate::graphql::assert_graphql_query;
    use chrono::NaiveDate;
    use repository::{
        mock::{mock_loaction_1, mock_stock_line_a, MockDataInserts},
        schema::StockTakeLineRow,
        StockTakeLine, StorageConnectionManager,
    };
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stock_take_line::{
            update::{UpdateStockTakeLineError, UpdateStockTakeLineInput},
            StockTakeLineServiceTrait,
        },
    };

    type ServiceMethod = dyn Fn(
            &ServiceContext,
            &str,
            UpdateStockTakeLineInput,
        ) -> Result<StockTakeLine, UpdateStockTakeLineError>
        + Sync
        + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StockTakeLineServiceTrait for TestService {
        fn update_stock_take_line(
            &self,
            ctx: &ServiceContext,
            store_id: &str,
            input: UpdateStockTakeLineInput,
        ) -> Result<StockTakeLine, UpdateStockTakeLineError> {
            (self.0)(ctx, store_id, input)
        }
    }

    pub fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.stock_take_line_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_stock_take_line_update() {
        let (_, _, connection_manager, settings) = setup_all(
            "omsupply-database-gql-stock_take_line_update",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation UpdateStockTakeLine($storeId: String, $input: UpdateStockTakeLineInput!) {
          updateStockTakeLine(storeId: $storeId, input: $input) {
              ... on StockTakeLineNode {                    
                      id
              }
          }
      }"#;

        // success
        let test_service = TestService(Box::new(|_, _, _| {
            Ok(StockTakeLine {
                line: StockTakeLineRow {
                    id: "id1".to_string(),
                    stock_take_id: "stock take id".to_string(),
                    stock_line_id: Some("stock line id".to_string()),
                    location_id: Some("location id".to_string()),
                    snapshot_number_of_packs: 10,
                    counted_number_of_packs: Some(20),
                    comment: Some("comment".to_string()),
                    item_id: "item id".to_string(),
                    batch: Some("batch".to_string()),
                    expiry_date: Some(NaiveDate::from_ymd(2023, 1, 22)),
                    pack_size: Some(10),
                    cost_price_per_pack: Some(10.0),
                    sell_price_per_pack: Some(12.0),
                    note: Some("note".to_string()),
                },
                stock_line: Some(mock_stock_line_a()),
                location: Some(mock_loaction_1()),
            })
        }));
        let variables = Some(json!({
            "storeId": "store id",
            "input": {
                "id": "id1",
                "locationId": "location id",
                "snapshotNumberOfPacks": 20,
                "countedNumberOfPacks": 20,
                "comment": "comment",
                "batch": "batch",
                "expiryDate": "2023-01-22",
                "packSize": 10,
                "costPricePerPack": 10.0,
                "sellPricePerPack": 12.0,
                "note": "note"
            }
        }));
        let expected = json!({
            "updateStockTakeLine": {
              "id": "id1",
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
