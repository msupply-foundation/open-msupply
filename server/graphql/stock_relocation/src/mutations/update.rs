use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use repository::StockRelocationRow;
use service::auth::{Resource, ResourceAccessRequest};
use service::stock_relocation::update::{
    UpdateStockRelocation as UpdateServiceInput, UpdateStockRelocationError as UpdateServiceError,
};

use super::{LocationOnHold, NotEnoughStock, StockLineOnHold};
use crate::types::StockRelocationNodeStatus;

#[derive(InputObject)]
#[graphql(name = "UpdateStockRelocationInput")]
pub struct UpdateInput {
    pub id: String,
    pub from_number_of_packs: Option<f64>,
    pub to_location_id: Option<String>,
    pub to_pack_size: Option<f64>,
    pub status: Option<StockRelocationNodeStatus>,
}

#[derive(SimpleObject)]
pub struct UpdateStockRelocationNode {
    pub id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateStockRelocationError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateStockRelocationResponse")]
pub enum UpdateResponse {
    Response(UpdateStockRelocationNode),
    Error(UpdateError),
}

#[derive(Interface)]
#[graphql(name = "UpdateStockRelocationErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateErrorInterface {
    StockLineOnHold(StockLineOnHold),
    LocationOnHold(LocationOnHold),
    NotEnoughStock(NotEnoughStock),
}

pub fn update_stock_relocation(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateInput,
) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStockLine,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let UpdateInput {
        id,
        from_number_of_packs,
        to_location_id,
        to_pack_size,
        status,
    } = input;

    map_response(
        service_provider
            .stock_relocation_service
            .update_stock_relocation(
                &service_context,
                store_id,
                UpdateServiceInput {
                    id,
                    from_number_of_packs,
                    to_location_id,
                    to_pack_size,
                    status: status.map(|status| status.into()),
                },
            ),
    )
}

fn map_response(from: Result<StockRelocationRow, UpdateServiceError>) -> Result<UpdateResponse> {
    match from {
        Ok(row) => Ok(UpdateResponse::Response(UpdateStockRelocationNode {
            id: row.id,
        })),
        Err(error) => Ok(UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        })),
    }
}

fn map_error(error: UpdateServiceError) -> Result<UpdateErrorInterface> {
    use UpdateServiceError as E;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        E::StockLineOnHold(stock_line_id) => {
            return Ok(UpdateErrorInterface::StockLineOnHold(StockLineOnHold {
                stock_line_id,
            }))
        }
        E::LocationOnHold(location_id) => {
            return Ok(UpdateErrorInterface::LocationOnHold(LocationOnHold {
                location_id,
            }))
        }
        E::NotEnoughStock(stock_line_id) => {
            return Ok(UpdateErrorInterface::NotEnoughStock(NotEnoughStock {
                stock_line_id,
            }))
        }

        E::RelocationDoesNotExist
        | E::NotThisStoreRelocation
        | E::RelocationAlreadyFinalised
        | E::StockLineDoesNotExist
        | E::NotThisStoreStockLine
        | E::ToLocationDoesNotExist
        | E::NotThisStoreLocation
        | E::InvalidNumberOfPacks
        | E::InvalidPackSize
        | E::CannotHaveFractionalPack => BadUserInput(formatted_error),
        E::NewlyCreatedStockLineDoesNotExist | E::DatabaseError(_) | E::InternalError(_) => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{
        mock::MockDataInserts, StockRelocationRow, StockRelocationStatus, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stock_relocation::{
            update::{
                UpdateStockRelocation as UpdateServiceInput,
                UpdateStockRelocationError as UpdateServiceError,
            },
            StockRelocationServiceTrait,
        },
    };

    use crate::StockRelocationMutations;

    type UpdateMethod =
        dyn Fn(UpdateServiceInput) -> Result<StockRelocationRow, UpdateServiceError> + Sync + Send;

    struct TestService(Box<UpdateMethod>);

    impl StockRelocationServiceTrait for TestService {
        fn update_stock_relocation(
            &self,
            _: &ServiceContext,
            _: &str,
            input: UpdateServiceInput,
        ) -> Result<StockRelocationRow, UpdateServiceError> {
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
    async fn test_graphql_update_stock_relocation_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            StockRelocationMutations,
            "test_graphql_update_stock_relocation_success",
            MockDataInserts::none(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String!, $input: UpdateStockRelocationInput!) {
            updateStockRelocation(storeId: $storeId, input: $input) {
                ... on UpdateStockRelocationNode {
                    id
                }
            }
          }
        "#;

        let test_service = TestService(Box::new(|input| {
            assert_eq!(input.id, "relocation_1");
            assert_eq!(input.from_number_of_packs, Some(3.0));
            assert_eq!(input.to_location_id, Some("to_location".to_string()));
            assert_eq!(input.to_pack_size, Some(2.0));
            assert_eq!(input.status, Some(StockRelocationStatus::Finalised));
            Ok(StockRelocationRow {
                id: "relocation_1".to_string(),
                ..Default::default()
            })
        }));

        let variables = json!({
          "storeId": "n/a",
          "input": {
            "id": "relocation_1",
            "fromNumberOfPacks": 3,
            "toLocationId": "to_location",
            "toPackSize": 2,
            "status": "FINALISED"
          }
        });

        let expected = json!({
            "updateStockRelocation": {
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
