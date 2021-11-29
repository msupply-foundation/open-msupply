mod graphql {
    use crate::graphql::{assert_gql_query, ServiceOverride};
    use domain::location::{Location, UpdateLocation};
    use repository::mock::MockDataInserts;
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::location::update::{UpdateLocationError, UpdateLocationServiceTrait};

    type UpdateLocationMethod =
        dyn Fn(UpdateLocation) -> Result<Location, UpdateLocationError> + Sync + Send;

    struct TestService(pub Box<UpdateLocationMethod>);

    impl UpdateLocationServiceTrait for TestService {
        fn update_location(&self, input: UpdateLocation) -> Result<Location, UpdateLocationError> {
            (self.0)(input)
        }
    }

    macro_rules! service_override {
        ($closure:expr) => {{
            ServiceOverride::new()
                .set_update_location_service(Box::new(|| Box::new(TestService(Box::new($closure)))))
        }};
    }

    #[actix_rt::test]
    async fn test_graphql_update_location_errors() {
        let (_, _, settings) = setup_all(
            "test_graphql_update_location_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateLocationInput!) {
            updateLocation(input: $input) {
              ... on UpdateLocationError {
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

        // Record Not Found
        let service_override =
            service_override!(|_| Err(UpdateLocationError::LocationDoesNotExist));

        let expected = json!({
            "updateLocation": {
              "error": {
                "__typename": "RecordNotFound"
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

        // Not current store location
        let service_override =
            service_override!(|_| Err(UpdateLocationError::LocationDoesNotBelongToCurrentStore));

        let expected = json!({
            "updateLocation": {
              "error": {
                "__typename": "RecordBelongsToAnotherStore",
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
              mutation ($input: UpdateLocationInput!) {
                  updateLocation(input: $input) {
                    ... on UpdateLocationError {
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

        let service_override = service_override!(|_| Err(UpdateLocationError::CodeAlreadyExists));

        let expected = json!({
            "updateLocation": {
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
         mutation ($input: UpdateLocationInput!) {
             updateLocation(input: $input) {
               ... on UpdateLocationError {
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
            service_override!(|_| Err(UpdateLocationError::UpdatedRecordDoesNotExist));

        let expected = json!({
            "updateLocation": {
              "error": {
                "__typename": "InternalError",
                "description": "Internal Error",
                "fullError": "Internal Error: Could not find record after updating"
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
    async fn test_graphql_update_location_success() {
        let (_, _, settings) = setup_all(
            "test_graphql_update_location_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateLocationInput!) {
            updateLocation(input: $input) {
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
            "updateLocation": {
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
