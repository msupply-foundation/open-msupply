#[cfg(test)]

mod query {
    use repository::{
        mock::{mock_store_a, MockDataInserts},
        test_db::setup_all,
    };

    use crate::{
        demographic::{
            insert_demographic_projection::InsertDemographicProjection,
            update_demographic_projection::{
                UpdateDemographicProjection, UpdateDemographicProjectionError,
            },
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn projection_insert() {
        let (_, _connection, connection_manager, _) = setup_all(
            "projection_service_insert",
            MockDataInserts::none().stores(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.demographic_service;

        // insert projection insert
        let id = "test_id".to_string();
        let id_2 = "test_id_2".to_string();
        let base_year_1 = 2024;
        let base_year_2 = 2025;
        let base_year_3 = 3025;
        let projection = service
            .insert_demographic_projection(
                &ctx,
                InsertDemographicProjection {
                    id: id.clone(),
                    base_year: base_year_1,
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(projection.id, id);

        // Check we can update base_year
        let projection = service
            .update_demographic_projection(
                &ctx,
                UpdateDemographicProjection {
                    id: id.clone(),
                    base_year: Some(base_year_2.clone()),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(projection.base_year, base_year_2);

        // insert second indicator

        let projection = service
            .insert_demographic_projection(
                &ctx,
                InsertDemographicProjection {
                    id: id_2.clone(),
                    base_year: base_year_3,
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(projection.id, id_2);

        // Check we can't update to same base year
        assert_eq!(
            service.update_demographic_projection(
                &ctx,
                UpdateDemographicProjection {
                    id: id_2.clone(),
                    base_year: Some(base_year_2.clone()),
                    ..Default::default()
                },
            ),
            Err(UpdateDemographicProjectionError::DemographicProjectionBaseYearAlreadyExists)
        );
    }
}
