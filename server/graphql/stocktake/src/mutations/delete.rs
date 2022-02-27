use async_graphql::*;

use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;

use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stocktake::delete::DeleteStocktakeError as ServiceError,
};

#[derive(InputObject)]
pub struct DeleteStocktakeInput {
    pub id: String,
}

#[derive(SimpleObject)]
pub struct DeleteStocktakeNode {
    /// The id of the deleted stocktake
    pub id: String,
}

#[derive(Union)]
pub enum DeleteStocktakeResponse {
    Response(DeleteStocktakeNode),
}

pub fn delete_stocktake(
    ctx: &Context<'_>,
    store_id: &str,
    input: DeleteStocktakeInput,
) -> Result<DeleteStocktakeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    do_delete_stocktake(&service_ctx, service_provider, store_id, input)
}

pub fn do_delete_stocktake(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: DeleteStocktakeInput,
) -> Result<DeleteStocktakeResponse> {
    let service = &service_provider.stocktake_service;
    match service.delete_stocktake(&service_ctx, store_id, &input.id) {
        Ok(stocktake_id) => Ok(DeleteStocktakeResponse::Response(DeleteStocktakeNode {
            id: stocktake_id,
        })),
        Err(err) => {
            let formatted_error = format!("Delete stocktake {}: {:#?}", input.id, err);
            let graphql_error = match err {
                ServiceError::DatabaseError(err) => err.into(),
                ServiceError::InvalidStore => StandardGraphqlError::BadUserInput(formatted_error),
                ServiceError::StocktakeDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                ServiceError::StocktakeLinesExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                ServiceError::CannotEditFinalised => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{test_helpers::setup_graphl_test, assert_graphql_query};
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;

    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake::{delete::DeleteStocktakeError, StocktakeServiceTrait},
    };

    use crate::StocktakeMutations;

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
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            StocktakeMutations,
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
