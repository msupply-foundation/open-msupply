use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordAlreadyExist, UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::LocationNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    location::insert::{InsertLocation, InsertLocationError as ServiceError},
};

pub fn insert_location(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertLocationInput,
) -> Result<InsertLocationResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateLocation,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .location_service
        .insert_location(&service_context, input.into())
    {
        Ok(location) => Ok(InsertLocationResponse::Response(LocationNode::from_domain(
            location,
        ))),
        Err(error) => Ok(InsertLocationResponse::Error(InsertLocationError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]
pub struct InsertLocationInput {
    pub id: String,
    pub code: String,
    pub name: Option<String>,
    pub on_hold: Option<bool>,
}

impl From<InsertLocationInput> for InsertLocation {
    fn from(
        InsertLocationInput {
            id,
            code,
            name,
            on_hold,
        }: InsertLocationInput,
    ) -> Self {
        InsertLocation {
            id,
            code,
            name,
            on_hold,
        }
    }
}
#[derive(SimpleObject)]
pub struct InsertLocationError {
    pub error: InsertLocationErrorInterface,
}

#[derive(Union)]
pub enum InsertLocationResponse {
    Error(InsertLocationError),
    Response(LocationNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertLocationErrorInterface {
    LocationAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<InsertLocationErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::LocationAlreadyExists => BadUserInput(formatted_error),
        ServiceError::LocationWithCodeAlreadyExists => BadUserInput(formatted_error),
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {

    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        location::Location, mock::MockDataInserts, LocationRow, StorageConnectionManager,
    };
    use serde_json::json;

    use service::{
        location::{
            insert::{InsertLocation, InsertLocationError},
            LocationServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::LocationMutations;

    type InsertLocationMethod =
        dyn Fn(InsertLocation) -> Result<Location, InsertLocationError> + Sync + Send;

    pub struct TestService(pub Box<InsertLocationMethod>);

    impl LocationServiceTrait for TestService {
        fn insert_location(
            &self,
            _: &ServiceContext,
            input: InsertLocation,
        ) -> Result<Location, InsertLocationError> {
            (self.0)(input)
        }
    }

    pub fn service_provider(
        location_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.location_service = Box::new(location_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_insert_location_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            LocationMutations,
            "test_graphql_insert_location_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertLocationInput!) {
            insertLocation(input: $input, storeId: \"store_a\") {
              ... on InsertLocationError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",
            "code": "n/a",
            "name": "n/a",
          }
        }));

        // Record Already Exists
        let test_service = TestService(Box::new(|_| {
            Err(InsertLocationError::LocationAlreadyExists)
        }));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // Unique code violation
        let mutation = r#"
              mutation ($input: InsertLocationInput!) {
                  insertLocation(input: $input, storeId: \"store_a\") {
                    ... on InsertLocationError {
                      error {
                        ... on UniqueValueViolation {
                            __typename
                            field
                        }
                      }
                    }
                  }
                }
              "#;

        let test_service = TestService(Box::new(|_| {
            Err(InsertLocationError::LocationWithCodeAlreadyExists)
        }));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // Created record does not exists (this shouldn't happen, but want to test internal error)
        let mutation = r#"
         mutation ($input: InsertLocationInput!) {
             insertLocation(input: $input, storeId: \"store_a\") {
               ... on InsertLocationError {
                 error {
                   ... on InternalError {
                       __typename
                       description
                       fullError
                   }
                 }
               }
             }
           }
         "#;

        let test_service = TestService(Box::new(|_| {
            Err(InsertLocationError::CreatedRecordNotFound)
        }));
        let expected_message = "Internal error";
        assert_standard_graphql_error!(
            &settings,
            mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_insert_location_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            LocationMutations,
            "test_graphql_insert_location_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertLocationInput!) {
            insertLocation(input: $input, storeId: \"store_a\") {
              ... on LocationNode {
                id
                code
                name
                onHold
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",
            "code": "n/a",
            "name": "n/a",
          }
        }));

        // Record Already Exists
        let test_service = TestService(Box::new(|_| {
            Ok(Location {
                location_row: LocationRow {
                    id: "id".to_owned(),
                    name: "name".to_owned(),
                    code: "code".to_owned(),
                    on_hold: true,
                    store_id: "store_a".to_owned(),
                },
            })
        }));

        let expected = json!({
            "insertLocation": {
                "id": "id",
                "name": "name",
                "code": "code",
                "onHold": true

            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
