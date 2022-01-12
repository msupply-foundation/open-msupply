mod graphql {
    use crate::graphql::assert_graphql_query;
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stock_take::{delete::DeleteStockTakeError, StockTakeServiceTrait},
    };

    type ServiceMethod =
        dyn Fn(&ServiceContext, &str, &str) -> Result<String, DeleteStockTakeError> + Sync + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StockTakeServiceTrait for TestService {
        fn delete_stock_take(
            &self,
            ctx: &ServiceContext,
            store_id: &str,
            stock_take_id: &str,
        ) -> Result<String, DeleteStockTakeError> {
            (self.0)(ctx, store_id, stock_take_id)
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
    async fn test_graphql_stock_take_delete() {
        let (_, _, connection_manager, settings) = setup_all(
            "omsupply-database-gql-stock_take_delete",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation DeleteStockTake($storeId: String, $input: DeleteStockTakeInput!) {
          deleteStockTake(storeId: $storeId, input: $input) {
              ... on DeleteStockTakeNode {                    
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
            "deleteStockTake": {
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
