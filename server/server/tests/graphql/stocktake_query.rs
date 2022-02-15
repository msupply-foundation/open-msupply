mod graphql {
    use crate::graphql::assert_graphql_query;
    use chrono::NaiveDate;
    use domain::PaginationOption;
    use repository::{
        mock::{mock_stocktake_a, MockDataInserts},
        schema::{StocktakeRow, StocktakeStatus},
        Stocktake, StocktakeFilter, StocktakeSort, StorageConnectionManager,
    };
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake::StocktakeServiceTrait,
        ListError, ListResult,
    };

    type ServiceMethod = dyn Fn(
            &ServiceContext,
            &str,
            Option<PaginationOption>,
            Option<StocktakeFilter>,
            Option<StocktakeSort>,
        ) -> Result<ListResult<Stocktake>, ListError>
        + Sync
        + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StocktakeServiceTrait for TestService {
        fn get_stocktakes(
            &self,
            ctx: &ServiceContext,
            store_id: &str,
            pagination: Option<PaginationOption>,
            filter: Option<StocktakeFilter>,
            sort: Option<StocktakeSort>,
        ) -> Result<ListResult<Stocktake>, ListError> {
            (self.0)(ctx, store_id, pagination, filter, sort)
        }
    }

    pub fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.stocktake_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_stocktakes_query() {
        let (_, _, connection_manager, settings) = setup_all(
            "omsupply-database-gql-stocktakes_query",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"query QueryStocktakes($storeId: String, $page: PaginationInput!, $filter: StocktakeFilterInput, $sort: [StocktakeSortInput]) {
            stocktakes(storeId: $storeId, page: $page, filter: $filter, sort: $sort) {
                ... on StocktakeConnector {
                    totalCount
                    nodes {
                        id
                        storeId
                        stocktakeNumber
                        comment
                        description
                        status
                        createdDatetime
                        finalisedDatetime
                        inventoryAdjustmentId
                        lines {
                            totalCount
                        }
                    }                      
                }
            }
        }"#;

        // success
        let test_service = TestService(Box::new(|_, _, _, _, _| {
            Ok(ListResult {
                count: 1,
                rows: vec![StocktakeRow {
                    id: "id1".to_string(),
                    stocktake_number: 123,
                    store_id: "store id".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    status: StocktakeStatus::Finalised,
                    created_datetime: NaiveDate::from_ymd(2022, 1, 22).and_hms(15, 16, 0),
                    finalised_datetime: Some(NaiveDate::from_ymd(2022, 1, 23).and_hms(15, 16, 0)),
                    inventory_adjustment_id: Some("inv id".to_string()),
                }],
            })
        }));
        let variables = Some(json!({
            "storeId": "store id",
            "page": {}
        }));
        let expected = json!({
          "stocktakes": {
            "totalCount": 1,
            "nodes": [{
              "id": "id1",
              "storeId": "store id",
              "stocktakeNumber": 123,
              "comment": "comment",
              "description": "description",
              "status": "FINALISED",
              "createdDatetime": "2022-01-22T15:16:00",
              "finalisedDatetime": "2022-01-23T15:16:00",
              "inventoryAdjustmentId": "inv id",
              "lines": {
                "totalCount": 0
              }
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

    #[actix_rt::test]
    async fn test_graphql_stocktake_query() {
        let (_, _, _, settings) = setup_all(
            "omsupply-database-gql-stocktake_query",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"query QueryStocktake($storeId: String, $id: String) {
            stocktake(storeId: $storeId, id: $id) {
                ... on StocktakeNode {
                    id
                }
            }
        }"#;
        let expected_stocktake = mock_stocktake_a();
        let variables = Some(json!({
            "storeId": expected_stocktake.store_id,
            "id": expected_stocktake.id,
        }));
        let expected = json!({
            "stocktake": {
                "id": expected_stocktake.id
            }
        });
        assert_graphql_query!(&settings, query, &variables, &expected, None);
    }

    #[actix_rt::test]
    async fn test_graphql_stocktake_by_number_query() {
        let (_, _, _, settings) = setup_all(
            "omsupply-database-gql-stocktake_by_number_query",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"query QueryStocktakeByNumber($storeId: String, $stocktakeNumber: String) {
            stocktakeByNumber(storeId: $storeId, stocktakeNumber: $stocktakeNumber) {
                ... on StocktakeNode {
                    stocktakeNumber
                }
            }
        }"#;
        let expected_stocktake = mock_stocktake_a();
        let variables = Some(json!({
            "storeId": expected_stocktake.store_id,
            "stocktakeNumber": expected_stocktake.stocktake_number,
        }));
        let expected = json!({
          "stocktakeByNumber": {
            "stocktakeNumber": expected_stocktake.stocktake_number
          }
        });
        assert_graphql_query!(&settings, query, &variables, &expected, None);
    }
}
