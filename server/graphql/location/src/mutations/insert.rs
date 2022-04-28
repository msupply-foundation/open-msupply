use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordAlreadyExist, UniqueValueKey, UniqueValueViolation,
    },
    standard_graphql_error::validate_auth,
    ContextExt,
};
use graphql_types::types::LocationNode;
use repository::RepositoryError;
use service::{
    location::insert::{InsertLocation, InsertLocationError as InError},
    permission_validation::{Resource, ResourceAccessRequest},
};

pub fn insert_location(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertLocationInput,
) -> Result<InsertLocationResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateLocation,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = match service_provider.context() {
        Ok(service) => service,
        Err(error) => return Ok(InsertLocationResponse::Error(error.into())),
    };

    match service_provider.location_service.insert_location(
        &service_context,
        store_id,
        input.into(),
    ) {
        Ok(location) => Ok(InsertLocationResponse::Response(LocationNode::from_domain(
            location,
        ))),
        Err(error) => Ok(InsertLocationResponse::Error(error.into())),
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

impl From<RepositoryError> for InsertLocationError {
    fn from(error: RepositoryError) -> Self {
        let error = InsertLocationErrorInterface::DatabaseError(DatabaseError(error));
        InsertLocationError { error }
    }
}

impl From<InError> for InsertLocationError {
    fn from(error: InError) -> Self {
        use InsertLocationErrorInterface as OutError;
        let error = match error {
            InError::LocationAlreadyExists => {
                OutError::LocationAlreadyExists(RecordAlreadyExist {})
            }
            InError::LocationWithCodeAlreadyExists => {
                OutError::UniqueValueViolation(UniqueValueViolation(UniqueValueKey::Code))
            }
            InError::CreatedRecordNotFound => OutError::InternalError(InternalError(
                "Could not find record after creation".to_owned(),
            )),
            InError::DatabaseError(error) => OutError::DatabaseError(DatabaseError(error)),
        };
        InsertLocationError { error }
    }
}

#[cfg(test)]
mod test {

    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::{mock::MockDataInserts, Location, LocationRow, StorageConnectionManager};
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
            _: &str,
            input: InsertLocation,
        ) -> Result<Location, InsertLocationError> {
            (self.0)(input)
        }
    }

    pub fn service_provider(
        location_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.location_service = Box::new(location_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_insert_location_errors() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
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

        let expected = json!({
            "insertLocation": {
              "error": {
                "__typename": "RecordAlreadyExist"
              }
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

        let expected = json!({
            "insertLocation": {
              "error": {
                "__typename": "UniqueValueViolation",
                "field": "code"
              }
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

        let expected = json!({
            "insertLocation": {
              "error": {
                "__typename": "InternalError",
                "description": "Internal Error",
                "fullError": "Internal Error: Could not find record after creation"
              }
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

    #[actix_rt::test]
    async fn test_graphql_insert_location_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
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
