use async_graphql::*;

use graphql_core::simple_generic_errors::CannotEditStocktake;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::DeleteResponse as GenericDeleteResponse;

use service::{
    auth::{Resource, ResourceAccessRequest},
    stocktake::DeleteStocktakeError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "DeleteStocktakeInput")]
pub struct DeleteInput {
    pub id: String,
}

#[derive(Interface)]
#[graphql(name = "DeleteStocktakeErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteErrorInterface {
    CannotEditStocktake(CannotEditStocktake),
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteStocktakeError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteStocktakeResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, input: DeleteInput) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;
    map_response(
        service_provider
            .stocktake_service
            .delete_stocktake(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<String, ServiceError>) -> Result<DeleteResponse> {
    let result = match from {
        Ok(id) => DeleteResponse::Response(GenericDeleteResponse(id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::CannotEditFinalised => {
            return Ok(DeleteErrorInterface::CannotEditStocktake(
                CannotEditStocktake {},
            ))
        }
        // Standard Graphql Errors
        // TODO some are structured errors (where can be changed concurrently)
        ServiceError::StocktakeIsLocked => BadUserInput(formatted_error),
        ServiceError::InvalidStore => BadUserInput(formatted_error),
        ServiceError::StocktakeDoesNotExist => BadUserInput(formatted_error),
        ServiceError::StocktakeLinesExist => BadUserInput(formatted_error),
        ServiceError::LineDeleteError { .. } => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl DeleteInput {
    pub fn to_domain(&self) -> String {
        self.id.clone()
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;

    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake::{DeleteStocktakeError, StocktakeServiceTrait},
    };

    use crate::StocktakeMutations;

    type ServiceMethod =
        dyn Fn(&ServiceContext, &str) -> Result<String, DeleteStocktakeError> + Sync + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StocktakeServiceTrait for TestService {
        fn delete_stocktake(
            &self,
            ctx: &ServiceContext,
            stocktake_id: String,
        ) -> Result<String, DeleteStocktakeError> {
            (self.0)(ctx, &stocktake_id)
        }
    }

    pub fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.stocktake_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_stocktake_delete() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            StocktakeMutations,
            "omsupply-database-gql-stocktake_delete",
            MockDataInserts::all(),
        )
        .await;
        let query = r#"mutation DeleteStocktake($storeId: String, $input: DeleteStocktakeInput!) {
            deleteStocktake(storeId: $storeId, input: $input) {
                ... on DeleteResponse {                    
                        id
                }
            }
        }"#;

        let variables = Some(json!({
            "storeId": "store id",
            "input": {
                "id": "id1"
            }
        }));

        // Stocktake is locked mapping
        let test_service = TestService(Box::new(|_, _| {
            Err(DeleteStocktakeError::StocktakeIsLocked)
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
        let test_service = TestService(Box::new(|_, _| Ok("id1".to_string())));

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
