use async_graphql::*;

use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;

use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stocktake_line::delete::DeleteStocktakeLineError,
};

#[derive(InputObject)]
pub struct DeleteStocktakeLineInput {
    pub id: String,
}

#[derive(SimpleObject)]
pub struct DeleteStocktakeLineNode {
    pub id: String,
}

#[derive(Union)]
pub enum DeleteStocktakeLineResponse {
    Response(DeleteStocktakeLineNode),
}

pub fn delete_stocktake_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: DeleteStocktakeLineInput,
) -> Result<DeleteStocktakeLineResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    do_delete_stocktake_line(&service_ctx, service_provider, store_id, input)
}

pub fn do_delete_stocktake_line(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: DeleteStocktakeLineInput,
) -> Result<DeleteStocktakeLineResponse> {
    let service = &service_provider.stocktake_line_service;
    match service.delete_stocktake_line(&service_ctx, store_id, &input.id) {
        Ok(id) => Ok(DeleteStocktakeLineResponse::Response(
            DeleteStocktakeLineNode { id },
        )),
        Err(err) => {
            let formatted_error = format!("Delete stocktake line {}: {:#?}", input.id, err);
            let graphql_error = match err {
                DeleteStocktakeLineError::DatabaseError(err) => err.into(),
                DeleteStocktakeLineError::InternalError(err) => {
                    StandardGraphqlError::InternalError(err)
                }
                DeleteStocktakeLineError::StocktakeLineDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                DeleteStocktakeLineError::InvalidStore => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                DeleteStocktakeLineError::CannotEditFinalised => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                // TODO should be standard error (can lock concurrently)
                DeleteStocktakeLineError::StocktakeIsLocked => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}

#[cfg(test)]
mod graphql {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;

    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake_line::{delete::DeleteStocktakeLineError, StocktakeLineServiceTrait},
    };

    use crate::StocktakeLineMutations;

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
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            StocktakeLineMutations,
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

        let variables = Some(json!({
            "storeId": "store id",
            "input": {
                "id": "id1",
            }
        }));

        // Stocktake is locked mapping
        let test_service = TestService(Box::new(|_, _, _| {
            Err(DeleteStocktakeLineError::StocktakeIsLocked)
        }));

        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &query,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // success
        let test_service = TestService(Box::new(|_, _, _| Ok("id1".to_string())));

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
