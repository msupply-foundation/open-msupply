mod graphql {
    use crate::graphql::{assert_gql_query, ServiceOverride};
    use domain::location::{InsertLocation, Location};
    use repository::mock::MockDataInserts;
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::location::insert::{InsertLocationError, InsertLocationServiceTrait};

    type InsertLocationMethod =
        dyn Fn(InsertLocation) -> Result<Location, InsertLocationError> + Sync + Send;

    struct TestService(pub Box<InsertLocationMethod>);

    impl InsertLocationServiceTrait for TestService {
        fn insert_location(&self, input: InsertLocation) -> Result<Location, InsertLocationError> {
            (self.0)(input)
        }
    }

    macro_rules! service_override {
        ($closure:expr) => {{
            ServiceOverride::new()
                .set_insert_location_service(Box::new(|| Box::new(TestService(Box::new($closure)))))
        }};
    }

    #[actix_rt::test]
    async fn test_graphql_insert_location_errors() {
        let (_, _, settings) = setup_all(
            "test_graphql_insert_location_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertLocationInput!) {
            insertLocation(input: $input) {
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
        let service_override =
            service_override!(|_| Err(InsertLocationError::LocationAlreadyExists));

        let expected = json!({
            "insertLocation": {
              "error": {
                "__typename": "RecordAlreadyExist"
              }
            }
          }
        );

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_override),
        )
        .await;

        // Unique code violation
        let mutation = r#"
              mutation ($input: InsertLocationInput!) {
                  insertLocation(input: $input) {
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

        let service_override =
            service_override!(|_| Err(InsertLocationError::LocationWithCodeAlreadyExists));

        let expected = json!({
            "insertLocation": {
              "error": {
                "__typename": "UniqueValueViolation",
                "field": "code"
              }
            }
          }
        );

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_override),
        )
        .await;

        // Created record does not exists (this shouldn't happen, but want to test internal error)
        let mutation = r#"
         mutation ($input: InsertLocationInput!) {
             insertLocation(input: $input) {
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

        let service_override =
            service_override!(|_| Err(InsertLocationError::CreatedRecordDoesNotExist));

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

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_override),
        )
        .await;
    }

    #[actix_rt::test]
    async fn test_graphql_insert_location_success() {
        let (_, _, settings) = setup_all(
            "test_graphql_insert_location_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertLocationInput!) {
            insertLocation(input: $input) {
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
        let service_override = service_override!(|_| Ok(Location {
            id: "id".to_owned(),
            name: "name".to_owned(),
            code: "code".to_owned(),
            on_hold: true
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

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_override),
        )
        .await;
    }
}
