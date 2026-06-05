use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use repository::StockRelocationRow;
use service::auth::{Resource, ResourceAccessRequest};
use service::stock_relocation::insert::{
    InsertStockRelocation as ServiceInput, InsertStockRelocationError as ServiceError,
    InsertStockRelocationLine as ServiceLine,
};

#[derive(InputObject)]
pub struct InsertStockRelocationLineInput {
    pub id: String,
    pub from_stock_line_id: String,
    pub from_number_of_packs: f64,
    pub to_location_id: Option<String>,
    pub to_pack_size: f64,
}

#[derive(InputObject)]
#[graphql(name = "InsertStockRelocationInput")]
pub struct InsertInput {
    pub from_location_id: Option<String>,
    pub lines: Vec<InsertStockRelocationLineInput>,
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            from_location_id,
            lines,
        } = self;
        ServiceInput {
            from_location_id,
            lines: lines
                .into_iter()
                .map(|line| ServiceLine {
                    id: line.id,
                    from_stock_line_id: line.from_stock_line_id,
                    from_number_of_packs: line.from_number_of_packs,
                    to_location_id: line.to_location_id,
                    to_pack_size: line.to_pack_size,
                })
                .collect(),
        }
    }
}

#[derive(SimpleObject)]
pub struct InsertStockRelocationNode {
    /// Ids of the created stock_relocation records.
    pub ids: Vec<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertStockRelocationError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertStockRelocationResponse")]
pub enum InsertResponse {
    Response(InsertStockRelocationNode),
    Error(InsertError),
}

pub struct StockLineOnHold {
    pub stock_line_id: String,
}
#[Object]
impl StockLineOnHold {
    pub async fn description(&self) -> &str {
        "Stock line is on hold and cannot be moved."
    }
    pub async fn stock_line_id(&self) -> &str {
        &self.stock_line_id
    }
}

pub struct LocationOnHold {
    pub location_id: String,
}
#[Object]
impl LocationOnHold {
    pub async fn description(&self) -> &str {
        "Location is on hold."
    }
    pub async fn location_id(&self) -> &str {
        &self.location_id
    }
}

pub struct NotEnoughStock {
    pub stock_line_id: String,
}
#[Object]
impl NotEnoughStock {
    pub async fn description(&self) -> &str {
        "Not enough available stock to move."
    }
    pub async fn stock_line_id(&self) -> &str {
        &self.stock_line_id
    }
}

#[derive(Interface)]
#[graphql(name = "InsertStockRelocationErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertErrorInterface {
    StockLineOnHold(StockLineOnHold),
    LocationOnHold(LocationOnHold),
    NotEnoughStock(NotEnoughStock),
}

pub fn insert_stock_relocation(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertInput,
) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStockLine,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .stock_relocation_service
            .insert_stock_relocation(&service_context, store_id, input.to_domain()),
    )
}

fn map_response(from: Result<Vec<StockRelocationRow>, ServiceError>) -> Result<InsertResponse> {
    match from {
        Ok(rows) => Ok(InsertResponse::Response(InsertStockRelocationNode {
            ids: rows.into_iter().map(|row| row.id).collect(),
        })),
        Err(error) => Ok(InsertResponse::Error(InsertError {
            error: map_error(error)?,
        })),
    }
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::StockLineOnHold(stock_line_id) => {
            return Ok(InsertErrorInterface::StockLineOnHold(StockLineOnHold {
                stock_line_id,
            }))
        }
        ServiceError::LocationOnHold(location_id) => {
            return Ok(InsertErrorInterface::LocationOnHold(LocationOnHold {
                location_id,
            }))
        }
        ServiceError::NotEnoughStock(stock_line_id) => {
            return Ok(InsertErrorInterface::NotEnoughStock(NotEnoughStock {
                stock_line_id,
            }))
        }

        ServiceError::StockLineDoesNotExist
        | ServiceError::NotThisStoreStockLine
        | ServiceError::ToLocationDoesNotExist
        | ServiceError::NotThisStoreLocation
        | ServiceError::InvalidNumberOfPacks
        | ServiceError::InvalidPackSize
        | ServiceError::CannotHaveFractionalPack => BadUserInput(formatted_error),
        ServiceError::NewlyCreatedStockLineDoesNotExist
        | ServiceError::DatabaseError(_)
        | ServiceError::InternalError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{mock::MockDataInserts, StockRelocationRow, StorageConnectionManager};
    use serde_json::json;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stock_relocation::{
            insert::{
                InsertStockRelocation as ServiceInput, InsertStockRelocationError as ServiceError,
                InsertStockRelocationLine as ServiceLine,
            },
            StockRelocationServiceTrait,
        },
    };

    use crate::StockRelocationMutations;

    type InsertMethod =
        dyn Fn(ServiceInput) -> Result<Vec<StockRelocationRow>, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertMethod>);

    impl StockRelocationServiceTrait for TestService {
        fn insert_stock_relocation(
            &self,
            _: &ServiceContext,
            _: &str,
            input: ServiceInput,
        ) -> Result<Vec<StockRelocationRow>, ServiceError> {
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

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "lines": []
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_insert_stock_relocation_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            StockRelocationMutations,
            "test_graphql_insert_stock_relocation_errors",
            MockDataInserts::none(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertStockRelocationInput!, $storeId: String!) {
            insertStockRelocation(storeId: $storeId, input: $input) {
              ... on InsertStockRelocationError {
                error {
                  __typename
                  ... on StockLineOnHold { stockLineId }
                  ... on LocationOnHold { locationId }
                  ... on NotEnoughStock { stockLineId }
                }
              }
            }
          }
        "#;

        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::StockLineOnHold("stock_line_a".to_string()))
        }));
        let expected = json!({
            "insertStockRelocation": {
              "error": {
                "__typename": "StockLineOnHold",
                "stockLineId": "stock_line_a"
              }
            }
        });
        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::LocationOnHold("location_a".to_string()))
        }));
        let expected = json!({
            "insertStockRelocation": {
              "error": {
                "__typename": "LocationOnHold",
                "locationId": "location_a"
              }
            }
        });
        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::NotEnoughStock("stock_line_a".to_string()))
        }));
        let expected = json!({
            "insertStockRelocation": {
              "error": {
                "__typename": "NotEnoughStock",
                "stockLineId": "stock_line_a"
              }
            }
        });
        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        let test_service = TestService(Box::new(|_| Err(ServiceError::StockLineDoesNotExist)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::InternalError(
                "something went wrong".to_string(),
            ))
        }));
        let expected_message = "Internal error";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_insert_stock_relocation_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            StockRelocationMutations,
            "test_graphql_insert_stock_relocation_success",
            MockDataInserts::none(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String!, $input: InsertStockRelocationInput!) {
            insertStockRelocation(storeId: $storeId, input: $input) {
                ... on InsertStockRelocationNode {
                    ids
                }
            }
          }
        "#;

        let test_service = TestService(Box::new(|input| {
            assert_eq!(
                input,
                ServiceInput {
                    from_location_id: Some("from_location".to_string()),
                    lines: vec![ServiceLine {
                        id: "relocation_1".to_string(),
                        from_stock_line_id: "stock_line_a".to_string(),
                        from_number_of_packs: 5.0,
                        to_location_id: Some("to_location".to_string()),
                        to_pack_size: 2.0,
                    }],
                }
            );
            Ok(vec![StockRelocationRow {
                id: "relocation_1".to_string(),
                ..Default::default()
            }])
        }));

        let variables = json!({
          "storeId": "n/a",
          "input": {
            "fromLocationId": "from_location",
            "lines": [{
              "id": "relocation_1",
              "fromStockLineId": "stock_line_a",
              "fromNumberOfPacks": 5,
              "toLocationId": "to_location",
              "toPackSize": 2
            }]
          }
        });

        let expected = json!({
            "insertStockRelocation": {
              "ids": ["relocation_1"]
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
