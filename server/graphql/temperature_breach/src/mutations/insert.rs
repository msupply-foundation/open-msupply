use async_graphql::*;
use chrono::NaiveDateTime;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordAlreadyExist, UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::TemperatureBreachNode;
use repository::{TemperatureBreachRow, TemperatureBreachRowType};
use service::{
    auth::{Resource, ResourceAccessRequest},
    temperature_breach::insert::{InsertTemperatureBreach, InsertTemperatureBreachError as ServiceError},
};

pub fn insert_temperature_breach(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertTemperatureBreachInput,
) -> Result<InsertTemperatureBreachResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateTemperatureBreach,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .temperature_breach_service
        .insert_temperature_breach(&service_context, input.into())
    {
        Ok(temperature_breach) => Ok(InsertTemperatureBreachResponse::Response(TemperatureBreachNode::from_domain(
            temperature_breach,
        ))),
        Err(error) => Ok(InsertTemperatureBreachResponse::Error(InsertTemperatureBreachError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]
pub struct InsertTemperatureBreachInput {
    pub id: String,
    pub sensor_id: String,
    pub start_timestamp: NaiveDateTime,
    pub end_timestamp: NaiveDateTime,
    pub duration: i32,
    //pub r#type: TemperatureBreachRowType,
}

impl From<InsertTemperatureBreachInput> for InsertTemperatureBreach {
    fn from(
        InsertTemperatureBreachInput {
            id,
            sensor_id,
            start_timestamp,
            end_timestamp,
            duration,
            //r#type,
        }: InsertTemperatureBreachInput,
    ) -> Self {
        InsertTemperatureBreach {
            id,
            sensor_id,
            start_timestamp,
            end_timestamp,
            duration,
            //r#type,
        }
    }
}
#[derive(SimpleObject)]
pub struct InsertTemperatureBreachError {
    pub error: InsertTemperatureBreachErrorInterface,
}

#[derive(Union)]
pub enum InsertTemperatureBreachResponse {
    Error(InsertTemperatureBreachError),
    Response(TemperatureBreachNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertTemperatureBreachErrorInterface {
    TemperatureBreachAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<InsertTemperatureBreachErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::TemperatureBreachAlreadyExists => BadUserInput(formatted_error),
        ServiceError::TemperatureBreachNotUnique => BadUserInput(formatted_error),
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
    use repository::{mock::MockDataInserts, TemperatureBreachRowType, temperature_breach::TemperatureBreach, TemperatureBreachRow, StorageConnectionManager};
    use serde_json::json;

    use service::{
        temperature_breach::{
            insert::{InsertTemperatureBreach, InsertTemperatureBreachError},
            TemperatureBreachServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::TemperatureBreachMutations;

    type InsertTemperatureBreachMethod =
        dyn Fn(InsertTemperatureBreach) -> Result<TemperatureBreach, InsertTemperatureBreachError> + Sync + Send;

    pub struct TestService(pub Box<InsertTemperatureBreachMethod>);

    impl TemperatureBreachServiceTrait for TestService {
        fn insert_temperature_breach(
            &self,
            _: &ServiceContext,
            input: InsertTemperatureBreach,
        ) -> Result<TemperatureBreach, InsertTemperatureBreachError> {
            (self.0)(input)
        }
    }

    pub fn service_provider(
        temperature_breach_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.temperature_breach_service = Box::new(temperature_breach_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_insert_temperature_breach_errors() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            TemperatureBreachMutations,
            "test_graphql_insert_temperature_breach_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertTemperatureBreachInput!) {
            insertTemperatureBreach(input: $input, storeId: \"store_a\") {
              ... on InsertTemperatureBreachError {
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
            "sensorId": "n/a",
            "acknowledged": true,
          }
        }));

        // Record Already Exists
        let test_service = TestService(Box::new(|_| Err(InsertTemperatureBreachError::TemperatureBreachAlreadyExists)));
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
         mutation ($input: InsertTemperatureBreachInput!) {
             insertTemperatureBreach(input: $input, storeId: \"store_a\") {
               ... on InsertTemperatureBreachError {
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

        let test_service = TestService(Box::new(|_| Err(InsertTemperatureBreachError::CreatedRecordNotFound)));
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
    async fn test_graphql_insert_temperature_breach_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            TemperatureBreachMutations,
            "test_graphql_insert_temperature_breach_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertTemperatureBreachInput!) {
            insertTemperatureBreach(input: $input, storeId: \"store_a\") {
              ... on TemperatureBreachNode {
                id
                sensorId
                acknowledged
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",
            "sensorId": "n/a",
            "acknowledged": true,
          }
        }));

        // Record Already Exists
        let test_service = TestService(Box::new(|_| {
            Ok(TemperatureBreach {
                temperature_breach_row: TemperatureBreachRow {
                    id: "id".to_owned(),
                    acknowledged: false,
                    store_id: Some("store_a".to_owned()),
                    location_id: None,
                    duration: 3600,
                    threshold_minimum: -273.0,
                    threshold_maximum: 2.0,
                    r#type: TemperatureBreachRowType::ColdConsecutive,
                    sensor_id: "sensor_1".to_owned(),
                    start_timestamp: NaiveDate::from_ymd_opt(2022, 7, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                        + Duration::seconds(47046),
                    end_timestamp: NaiveDate::from_ymd_opt(2022, 7, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                        + Duration::seconds(50646),
                    threshold_duration: 3600,
                },
            })
        }));

        let expected = json!({
            "insertTemperatureBreach": {
                "id": "id",
                "sensorID": "sensor_1",
                "acknowledged": false,
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
