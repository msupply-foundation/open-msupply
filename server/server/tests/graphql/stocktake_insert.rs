mod graphql {
    use crate::graphql::assert_graphql_query;
    use chrono::NaiveDate;
    use repository::{
        mock::MockDataInserts,
        schema::{StocktakeRow, StocktakeStatus},
        Stocktake, StorageConnectionManager,
    };
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake::{
            insert::{InsertStocktakeError, InsertStocktakeInput},
            StocktakeServiceTrait,
        },
    };

    type ServiceMethod = dyn Fn(&ServiceContext, &str, InsertStocktakeInput) -> Result<Stocktake, InsertStocktakeError>
        + Sync
        + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StocktakeServiceTrait for TestService {
        fn insert_stocktake(
            &self,
            ctx: &ServiceContext,
            store_id: &str,
            input: InsertStocktakeInput,
        ) -> Result<Stocktake, InsertStocktakeError> {
            (self.0)(ctx, store_id, input)
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
    async fn test_graphql_stocktake_insert() {
        let (_, _, connection_manager, settings) = setup_all(
            "omsupply-database-gql-stocktake_insert",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation InsertStocktake($storeId: String, $input: InsertStocktakeInput!) {
            insertStocktake(storeId: $storeId, input: $input) {
                ... on StocktakeNode {                    
                        id
                }
            }
        }"#;

        // success
        let test_service = TestService(Box::new(|_, _, _| {
            Ok(StocktakeRow {
                id: "id1".to_string(),
                stocktake_number: 123,
                store_id: "store id".to_string(),
                comment: Some("comment".to_string()),
                description: Some("description".to_string()),
                status: StocktakeStatus::Finalised,
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
            "insertStocktake": {
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
