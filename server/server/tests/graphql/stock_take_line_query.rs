mod graphql {
    use crate::graphql::assert_graphql_query;
    use chrono::NaiveDate;
    use domain::PaginationOption;
    use repository::{
        mock::{mock_loaction_1, mock_stock_line_a, MockDataInserts},
        schema::StockTakeLineRow,
        StockTakeLine, StockTakeLineFilter, StockTakeLineSort, StorageConnectionManager,
    };
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stock_take_line::{query::GetStockTakeLinesError, StockTakeLineServiceTrait},
        ListResult,
    };

    type ServiceMethod = dyn Fn(
            &ServiceContext,
            &str,
            &str,
            Option<PaginationOption>,
            Option<StockTakeLineFilter>,
            Option<StockTakeLineSort>,
        ) -> Result<ListResult<StockTakeLine>, GetStockTakeLinesError>
        + Sync
        + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StockTakeLineServiceTrait for TestService {
        fn get_stock_take_lines(
            &self,
            ctx: &ServiceContext,
            store_id: &str,
            stock_take_id: &str,
            pagination: Option<PaginationOption>,
            filter: Option<StockTakeLineFilter>,
            sort: Option<StockTakeLineSort>,
        ) -> Result<ListResult<StockTakeLine>, GetStockTakeLinesError> {
            (self.0)(ctx, store_id, stock_take_id, pagination, filter, sort)
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
    async fn test_graphql_stock_take_line_query() {
        let (_, _, connection_manager, settings) = setup_all(
            "omsupply-database-gql-stock_take_line_query",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"query QueryStockTakeLine($storeId: String, $stockTakeId: String, $page: PaginationInput!, $filter: StockTakeFilterInput) {
            stockTakeLines(storeId: $storeId, stockTakeId: $stockTakeId, page: $page, filter: $filter) {
                ... on StockTakeLineConnector {
                    totalCount
                    nodes {
                      id
                      stockTakeId
                      stockLine {
                        id
                      }
                      location {
                        id
                      }
                      snapshotNumberOfPacks
                      countedNumberOfPacks
                      comment
                      itemId
                      batch
                      expiryDate
                      packSize
                      costPricePerPack
                      sellPricePerPack
                      note
                    }                      
                }
            }
        }"#;

        // success
        let test_service = TestService(Box::new(|_, _, _, _, _, _| {
            Ok(ListResult {
                count: 1,
                rows: vec![StockTakeLine {
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
                }],
            })
        }));
        let variables = Some(json!({
            "storeId": "store id",
            "stockTakeId": "stock take id",
            "page": {}
        }));
        let expected = json!({
          "stockTakeLines": {
            "totalCount": 1,
            "nodes": [{
              "id": "id1",
              "stockTakeId": "stock take id",
              "stockLine": {
                "id": mock_stock_line_a().id,
              },
              "location": {
                "id": mock_loaction_1().id,
              },
              "snapshotNumberOfPacks": 10,
              "countedNumberOfPacks": 20,
              "comment": "comment",
              "itemId": "item id",
              "batch": "batch",
              "expiryDate": "2023-01-22",
              "packSize": 10,
              "costPricePerPack": 10.0,
              "sellPricePerPack": 12.0,
              "note": "note"
            }]
          }
        });
        assert_graphql_query!(
            &settings,
            query,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
