use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordAlreadyExist, UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::SensorNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    sensor::insert::{InsertSensor, InsertSensorError as ServiceError},
};

pub fn insert_sensor(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertSensorInput,
) -> Result<InsertSensorResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateSensor,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .sensor_service
        .insert_sensor(&service_context, input.into())
    {
        Ok(sensor) => Ok(InsertSensorResponse::Response(SensorNode::from_domain(
            sensor,
        ))),
        Err(error) => Ok(InsertSensorResponse::Error(InsertSensorError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]
pub struct InsertSensorInput {
    pub id: String,
    pub serial: String,
    pub name: Option<String>,
    pub is_active: Option<bool>,
}

impl From<InsertSensorInput> for InsertSensor {
    fn from(
        InsertSensorInput {
            id,
            serial,
            name: _,
            is_active: _,
        }: InsertSensorInput,
    ) -> Self {
        InsertSensor {
            id,
            serial,
            name: None,
            is_active: Some(true),
        }
    }
}
#[derive(SimpleObject)]
pub struct InsertSensorError {
    pub error: InsertSensorErrorInterface,
}

#[derive(Union)]
pub enum InsertSensorResponse {
    Error(InsertSensorError),
    Response(SensorNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertSensorErrorInterface {
    SensorAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<InsertSensorErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::SensorAlreadyExists => BadUserInput(formatted_error),
        ServiceError::SensorWithSerialAlreadyExists => BadUserInput(formatted_error),
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {

    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };
    use repository::{
        sensor::Sensor, mock::MockDataInserts, SensorRow, StorageConnectionManager,
    };
    use serde_json::json;

    use service::{
        sensor::{
            insert::{InsertSensor, InsertSensorError},
            SensorServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::SensorMutations;

    type InsertSensorMethod =
        dyn Fn(InsertSensor) -> Result<Sensor, InsertSensorError> + Sync + Send;

    pub struct TestService(pub Box<InsertSensorMethod>);

    impl SensorServiceTrait for TestService {
        fn insert_sensor(
            &self,
            _: &ServiceContext,
            input: InsertSensor,
        ) -> Result<Sensor, InsertSensorError> {
            (self.0)(input)
        }
    }

    pub fn service_provider(
        sensor_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.sensor_service = Box::new(sensor_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_insert_sensor_errors() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            SensorMutations,
            "test_graphql_insert_sensor_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertSensorInput!) {
            insertSensor(input: $input, storeId: \"store_a\") {
              ... on InsertSensorError {
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
            "serial": "n/a",
            "name": "n/a",
          }
        }));

        // Record Already Exists
        let test_service = TestService(Box::new(|_| {
            Err(InsertSensorError::SensorAlreadyExists)
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

        // Unique serial violation
        let mutation = r#"
              mutation ($input: InsertSensorInput!) {
                  insertSensor(input: $input, storeId: \"store_a\") {
                    ... on InsertSensorError {
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
            Err(InsertSensorError::SensorWithSerialAlreadyExists)
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

        // Created record does not exist (this shouldn't happen, but want to test internal error)
        let mutation = r#"
         mutation ($input: InsertSensorInput!) {
             insertSensor(input: $input, storeId: \"store_a\") {
               ... on InsertSensorError {
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
            Err(InsertSensorError::CreatedRecordNotFound)
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
    async fn test_graphql_insert_sensor_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            SensorMutations,
            "test_graphql_insert_sensor_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertSensorInput!) {
            insertSensor(input: $input, storeId: \"store_a\") {
              ... on SensorNode {
                id
                serial
                name
                isActive
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",
            "serial": "n/a",
            "name": "n/a",
          }
        }));

        // Record Already Exists
        let test_service = TestService(Box::new(|_| {
            Ok(Sensor {
                sensor_row: SensorRow {
                    id: "id".to_owned(),
                    name: "name".to_owned(),
                    serial: "serial".to_owned(),
                    is_active: true,
                    store_id: Some("store_a".to_owned()),
                    location_id: None,
                    log_interval: Some(5),
                    battery_level: Some(95),
                    last_connection_timestamp: None,
                },
            })
        }));

        let expected = json!({
            "insertSensor": {
                "id": "id",
                "name": "name",
                "serial": "serial",
                "isActive": true,
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
