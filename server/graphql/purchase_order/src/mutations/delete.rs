use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::{
    simple_generic_errors::{CannotDeleteNonNewPurchaseOrder, RecordNotFound},
    ContextExt,
};
use graphql_types::types::DeleteResponse as GenericDeleteResponse;

use async_graphql::*;
use service::auth::{Resource, ResourceAccessRequest};
use service::purchase_order::delete::DeletePurchaseOrderError as ServiceError;

#[derive(SimpleObject)]
#[graphql(name = "DeletePurchaseOrderError")]
pub struct DeleteError {
    pub error: DeletePurchaseOrderErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeletePurchaseOrderResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, id: String) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePurchaseOrder,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .purchase_order_service
            .delete_purchase_order(&service_context, store_id, id),
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

#[derive(Interface)]
#[graphql(field(name = "description", ty = "&str"))]
pub enum DeletePurchaseOrderErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotDeleteNonNewPurchaseOrder(CannotDeleteNonNewPurchaseOrder),
}

fn map_error(error: ServiceError) -> Result<DeletePurchaseOrderErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured errors
        ServiceError::PurchaseOrderDoesNotExist => {
            return Ok(DeletePurchaseOrderErrorInterface::RecordNotFound(
                RecordNotFound {},
            ))
        }
        ServiceError::CannotDeleteNonNewPurchaseOrder => {
            return Ok(
                DeletePurchaseOrderErrorInterface::CannotDeleteNonNewPurchaseOrder(
                    CannotDeleteNonNewPurchaseOrder {},
                ),
            )
        }
        // Standard Graphql Errors
        ServiceError::NotThisStorePurchaseOrder => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::LineDeleteError { .. } => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod graphql {
    use graphql_core::test_helpers::setup_graphql_test;
    use graphql_core::{assert_graphql_query, assert_standard_graphql_error};

    use repository::mock::{mock_purchase_order_a, MockDataInserts};
    use repository::PurchaseOrderRowRepository;
    use serde_json::json;

    use crate::{PurchaseOrderMutations, PurchaseOrderQueries};

    #[actix_rt::test]
    async fn test_graphql_delete_purchase_order() {
        let (_, connection, _, settings) = setup_graphql_test(
            PurchaseOrderQueries,
            PurchaseOrderMutations,
            "test_graphql_delete_purchase_order",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation DeletePurchaseOrder($id: String!) {
            deletePurchaseOrder(id: $id, storeId: \"store_a\") {
                ... on DeletePurchaseOrderError {
                  error {
                    __typename
                  }
                }
                ... on DeleteResponse {
                    id
                }
            }
        }"#;

        // RecordNotFound
        let variables = Some(json!({
          "id": "does not exist"
        }));
        let expected = json!({
            "deletePurchaseOrder": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // CannotDeleteNonNewPurchaseOrder (trying to delete finalized purchase order)
        let variables = Some(json!({
          "id": "test_purchase_order_c"
        }));
        let expected = json!({
            "deletePurchaseOrder": {
              "error": {
                "__typename": "CannotDeleteNonNewPurchaseOrder"
              }
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // NotThisStorePurchaseOrder
        let variables = Some(json!({
          "id": "test_purchase_order_d"
        }));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &query,
            &variables,
            &expected_message,
            None,
            None
        );

        // Test succeeding delete
        let variables = Some(json!({
          "id": mock_purchase_order_a().id
        }));
        let expected = json!({
            "deletePurchaseOrder": {
              "id": mock_purchase_order_a().id
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);
        // test entry has been deleted
        assert_eq!(
            PurchaseOrderRowRepository::new(&connection)
                .find_one_by_id(&mock_purchase_order_a().id)
                .unwrap(),
            None
        );
    }
}
