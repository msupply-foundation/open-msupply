use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use graphql_types::types::DeleteResponse;
use service::auth::{Resource, ResourceAccessRequest};
use service::stock_relocation::delete::{
    DeleteStockRelocation as DeleteServiceInput, DeleteStockRelocationError as DeleteServiceError,
};

#[derive(InputObject)]
#[graphql(name = "DeleteStockRelocationInput")]
pub struct DeleteInput {
    pub id: String,
}

#[derive(Union)]
#[graphql(name = "DeleteStockRelocationResponse")]
pub enum DeleteStockRelocationResponse {
    Response(DeleteResponse),
}

pub fn delete_stock_relocation(
    ctx: &Context<'_>,
    store_id: &str,
    input: DeleteInput,
) -> Result<DeleteStockRelocationResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStockLine,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let DeleteInput { id } = input;

    map_response(
        service_provider
            .stock_relocation_service
            .delete_stock_relocation(&service_context, store_id, DeleteServiceInput { id }),
    )
}

fn map_response(
    from: Result<String, DeleteServiceError>,
) -> Result<DeleteStockRelocationResponse> {
    match from {
        Ok(id) => Ok(DeleteStockRelocationResponse::Response(DeleteResponse(id))),
        Err(error) => {
            use DeleteServiceError as E;
            let formatted_error = format!("{error:#?}");

            let graphql_error = match error {
                E::RelocationDoesNotExist
                | E::NotThisStoreRelocation
                | E::RelocationAlreadyFinalised => BadUserInput(formatted_error),
                E::DatabaseError(_) => InternalError(formatted_error),
            };

            Err(graphql_error.extend())
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stock_relocation::{
            delete::{
                DeleteStockRelocation as DeleteServiceInput,
                DeleteStockRelocationError as DeleteServiceError,
            },
            StockRelocationServiceTrait,
        },
    };

    use crate::StockRelocationMutations;

    type DeleteMethod =
        dyn Fn(DeleteServiceInput) -> Result<String, DeleteServiceError> + Sync + Send;

    struct TestService(Box<DeleteMethod>);

    impl StockRelocationServiceTrait for TestService {
        fn delete_stock_relocation(
            &self,
            _: &ServiceContext,
            _: &str,
            input: DeleteServiceInput,
        ) -> Result<String, DeleteServiceError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.stock_relocation_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_delete_stock_relocation_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            StockRelocationMutations,
            "test_graphql_delete_stock_relocation_success",
            MockDataInserts::none(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String!, $input: DeleteStockRelocationInput!) {
            deleteStockRelocation(storeId: $storeId, input: $input) {
                ... on DeleteResponse {
                    id
                }
            }
          }
        "#;

        let test_service = TestService(Box::new(|input| {
            assert_eq!(input.id, "relocation_1");
            Ok(input.id)
        }));

        let variables = json!({
          "storeId": "n/a",
          "input": {
            "id": "relocation_1"
          }
        });

        let expected = json!({
            "deleteStockRelocation": {
              "id": "relocation_1"
            }
        });
        assert_graphql_query!(
            &settings,
            mutation,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
