#[cfg(test)]
mod query {
    use repository::mock::mock_store_a;
    use repository::EqualFilter;
    use repository::{
        mock::MockDataInserts,
        temperature_breach_config::{TemperatureBreachConfig, TemperatureBreachConfigFilter, TemperatureBreachConfigRepository},
        test_db::setup_all,
        TemperatureBreachConfigRow, TemperatureBreachRowType,
    };

    use crate::{
        temperature_breach_config::insert::{InsertTemperatureBreachConfig, InsertTemperatureBreachConfigError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_temperature_breach_config_service_errors() {
        let (mock_data, _, connection_manager, _) =
            setup_all("insert_temperature_breach_config_service_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.temperature_breach_config_service;

        assert_eq!(
            service.insert_temperature_breach_config(
                &context,
                InsertTemperatureBreachConfig {
                    id: mock_data["base"].temperature_breach_configs[0].id.clone(),
                    description: "invalid".to_owned(),
                    is_active: false
                },
            ),
            Err(InsertTemperatureBreachConfigError::TemperatureBreachConfigAlreadyExists)
        );

    }

    #[actix_rt::test]
    async fn insert_temperature_breach_config_service_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_temperature_breach_config_service_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let temperature_breach_config_repository = TemperatureBreachConfigRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.temperature_breach_config_service;

        let result_temperature_breach_config = TemperatureBreachConfig {
            temperature_breach_config_row: TemperatureBreachConfigRow {
                id: "new_id".to_owned(),
                description: "new_description".to_owned(),
                is_active: false,
                store_id: Some("store_a".to_owned()),
                duration: 3600,
                minimum_temperature: -273.0,
                maximum_temperature: 2.0,
                r#type: TemperatureBreachRowType::ColdConsecutive,
            },
        };

        assert_eq!(
            service.insert_temperature_breach_config(
                &context,
                InsertTemperatureBreachConfig {
                    id: "new_id".to_owned(),
                    description: "new_description".to_owned(),
                    is_active: false
                },
            ),
            Ok(result_temperature_breach_config.clone())
        );

        assert_eq!(
            temperature_breach_config_repository
                .query_by_filter(
                    TemperatureBreachConfigFilter::new()
                        .id(EqualFilter::equal_to("new_id"))
                        .store_id(EqualFilter::equal_to("store_a",))
                )
                .unwrap(),
            vec![result_temperature_breach_config]
        );

        // Insert temperature_breach_config with description that appears in temperature_breach_config in another store
        assert_eq!(
            service.insert_temperature_breach_config(
                &context,
                InsertTemperatureBreachConfig {
                    id: "new_id2".to_owned(),
                    description: "store_b_temperature_breach_config_description".to_owned(),
                    is_active: true,
                },
            ),
            Ok(TemperatureBreachConfig {
                temperature_breach_config_row: TemperatureBreachConfigRow {
                    id: "new_id2".to_owned(),
                    description: "store_b_temperature_breach_config_description".to_owned(),
                    is_active: true,
                    store_id: Some("store_a".to_owned()),
                    duration: 3600,
                    minimum_temperature: -273.0,
                    maximum_temperature: 2.0,
                    r#type: TemperatureBreachRowType::ColdConsecutive,
                }
            })
        );
    }
}
