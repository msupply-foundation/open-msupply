mod graphql {
    use crate::graphql::assert_graphql_query;
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake_line::{delete::DeleteStocktakeLineError, StocktakeLineServiceTrait},
    };

    type ServiceMethod = dyn Fn(&ServiceContext, &str, &str) -> Result<String, DeleteStocktakeLineError>
        + Sync
        + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StocktakeLineServiceTrait for TestService {
        fn delete_stocktake_line(
            &self,
            ctx: &ServiceContext,
            store_id: &str,
            stocktake_line_id: &str,
        ) -> Result<String, DeleteStocktakeLineError> {
            (self.0)(ctx, store_id, stocktake_line_id)
        }
    }

    pub fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.stocktake_line_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_stocktake_line_delete() {
        let (_, _, connection_manager, settings) = setup_all(
            "omsupply-database-gql-stocktake_line_delete",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation DeleteStocktakeLine($storeId: String, $input: DeleteStocktakeLineInput!) {
            deleteStocktakeLine(storeId: $storeId, input: $input) {
                ... on DeleteStocktakeLineNode {                    
                        id
                }
            }
        }"#;

        // success
        let test_service = TestService(Box::new(|_, _, _| Ok("id1".to_string())));
        let variables = Some(json!({
            "storeId": "store id",
            "input": {
                "id": "id1",
            }
        }));
        let expected = json!({
            "deleteStocktakeLine": {
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
