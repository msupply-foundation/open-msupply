#[cfg(test)]
mod query {
    use repository::mock::MockDataInserts;
    use repository::test_db::setup_all;

    use crate::program::insert_immunisation::InsertImmunisationProgram;
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn insert_immunisation_program_duplicate_check() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_immunisation_program_duplicate_check",
            MockDataInserts::none(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.program_service;

        // Create an immunisation program
        let program_insert = InsertImmunisationProgram {
            id: "program_id".to_owned(),
            name: "program_name".to_owned(),
        };

        let result = service
            .insert_immunisation_program(&context, program_insert.clone())
            .unwrap();

        assert_eq!(result.id, program_insert.id);

        // Try to create a program using the same name
        let program_insert = InsertImmunisationProgram {
            id: "program_id_2".to_owned(),
            name: "program_name".to_owned(),
        };

        assert_eq!(
            service.insert_immunisation_program(&context, program_insert),
            Err(crate::program::insert_immunisation::InsertImmunisationProgramError::ImmunisationProgramAlreadyExists)
        );
    }
}
