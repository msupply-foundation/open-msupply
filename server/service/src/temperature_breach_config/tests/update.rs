#[cfg(test)]
mod query {
    use repository::mock::mock_store_a;
    use repository::EqualFilter;
    use repository::{
        mock::MockDataInserts,
        temperature_breach_config::{TemperatureBreachConfigFilter, TemperatureBreachConfigRepository},
        test_db::setup_all,
    };

    use crate::{
        temperature_breach_config::update::{UpdateTemperatureBreachConfig, UpdateTemperatureBreachConfigError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn temperature_breach_config_service_update_errors() {
        let (_, _, connection_manager, _) =
            setup_all("temperature_breach_config_service_update_errors", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let temperature_breach_config_repository = TemperatureBreachConfigRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.temperature_breach_config_service;

        let temperature_breach_configs_not_in_store = temperature_breach_config_repository
            .query_by_filter(TemperatureBreachConfigFilter::new().store_id(EqualFilter::not_equal_to("store_a")))
            .unwrap();

        // TemperatureBreachConfig does not exist
        assert_eq!(
            service.update_temperature_breach_config(
                &context,
                UpdateTemperatureBreachConfig {
                    id: "invalid".to_owned(),
                    description: None,
                    is_active: None
                },
            ),
            Err(UpdateTemperatureBreachConfigError::TemperatureBreachConfigDoesNotExist)
        );

        // TemperatureBreachConfig for another store
        assert_eq!(
            service.update_temperature_breach_config(
                &context,
                UpdateTemperatureBreachConfig {
                    id: temperature_breach_configs_not_in_store[0].temperature_breach_config_row.id.clone(),
                    description: None,
                    is_active: None
                },
            ),
            Err(UpdateTemperatureBreachConfigError::TemperatureBreachConfigDoesNotBelongToCurrentStore)
        );
    }
    #[actix_rt::test]
    async fn temperature_breach_config_service_update_success() {
        let (_, _, connection_manager, _) =
            setup_all("temperature_breach_config_service_update_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let temperature_breach_config_repository = TemperatureBreachConfigRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.temperature_breach_config_service;

        let temperature_breach_configs_in_store = temperature_breach_config_repository
            .query_by_filter(TemperatureBreachConfigFilter::new().store_id(EqualFilter::equal_to("store_a")))
            .unwrap();

        // Success with no changes
        let temperature_breach_config = temperature_breach_configs_in_store[0].clone();
        assert_eq!(
            service.update_temperature_breach_config(
                &context,
                UpdateTemperatureBreachConfig {
                    id: temperature_breach_config.temperature_breach_config_row.id.clone(),
                    description: None,
                    is_active: None
                },
            ),
            Ok(temperature_breach_config.clone())
        );

        assert_eq!(
            temperature_breach_config_repository
                .query_by_filter(
                    TemperatureBreachConfigFilter::new().id(EqualFilter::equal_to(&temperature_breach_config.temperature_breach_config_row.id))
                )
                .unwrap()[0],
                temperature_breach_config
        );

        // Success with all changes and description that is not unique accross stores
        let mut temperature_breach_config = temperature_breach_configs_in_store[1].clone();
        temperature_breach_config.temperature_breach_config_row.description = "new_temperature_breach_config_description".to_owned();
        temperature_breach_config.temperature_breach_config_row.is_active = !temperature_breach_config.temperature_breach_config_row.is_active;

        assert_eq!(
            service.update_temperature_breach_config(
                &context,
                UpdateTemperatureBreachConfig {
                    id: temperature_breach_config.temperature_breach_config_row.id.clone(),
                    description: Some(temperature_breach_config.temperature_breach_config_row.description.clone()),
                    is_active: Some(temperature_breach_config.temperature_breach_config_row.is_active),
                },
            ),
            Ok(temperature_breach_config.clone())
        );

        assert_eq!(
            temperature_breach_config_repository
                .query_by_filter(
                    TemperatureBreachConfigFilter::new().id(EqualFilter::equal_to(&temperature_breach_config.temperature_breach_config_row.id))
                )
                .unwrap()[0],
                temperature_breach_config
        );
    }
}
