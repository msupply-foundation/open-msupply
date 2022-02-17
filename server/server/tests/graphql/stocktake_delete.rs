mod graphql {
    use crate::graphql::assert_graphql_query;
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake::{delete::DeleteStocktakeError, StocktakeServiceTrait},
    };

    type ServiceMethod =
        dyn Fn(&ServiceContext, &str, &str) -> Result<String, DeleteStocktakeError> + Sync + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StocktakeServiceTrait for TestService {
        fn delete_stocktake(
            &self,
            ctx: &ServiceContext,
            store_id: &str,
            stocktake_id: &str,
        ) -> Result<String, DeleteStocktakeError> {
            (self.0)(ctx, store_id, stocktake_id)
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
    async fn test_graphql_stocktake_delete() {
        let (_, _, connection_manager, settings) = setup_all(
            "omsupply-database-gql-stocktake_delete",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation DeleteStocktake($storeId: String, $input: DeleteStocktakeInput!) {
          deleteStocktake(storeId: $storeId, input: $input) {
              ... on DeleteStocktakeNode {                    
                      id
              }
          }
      }"#;

        // success
        let test_service = TestService(Box::new(|_, _, _| Ok("id1".to_string())));
        let variables = Some(json!({
            "storeId": "store id",
            "input": {
                "id": "id1"
            }
        }));
        let expected = json!({
            "deleteStocktake": {
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
