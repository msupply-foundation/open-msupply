mod graphql {
    use crate::graphql::assert_graphql_query;
    use repository::{
        mock::MockDataInserts, schema::LocationRow, Location, StorageConnectionManager,
    };
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        location::{
            insert::{InsertLocation, InsertLocationError},
            LocationServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

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
        let (_, _, connection_manager, settings) = setup_all(
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
            Err(InsertLocationError::CreatedRecordDoesNotExist)
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
        let (_, _, connection_manager, settings) = setup_all(
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
