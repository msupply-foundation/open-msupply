#[cfg(test)]
mod delete {
    use repository::mock::MockDataInserts;
    use repository::test_db::setup_all;
    use repository::{EqualFilter, ProgramFilter};

    use crate::program::delete_immunisation::DeleteImmunisationProgramError;
    use crate::program::insert_immunisation::InsertImmunisationProgram;
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn delete_immunisation_program_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "delete_immunisation_program_errors",
            MockDataInserts::none(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.program_service;

        assert_eq!(
            service.delete_immunisation_program(&context, "invalid_id".to_owned()),
            Err(DeleteImmunisationProgramError::ImmunisationProgramDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn delete_immunisation_program_success() {
        let (_, _, connection_manager, _) = setup_all(
            "delete_immunisation_program_success",
            MockDataInserts::none(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.program_service;

        // Create vaccine course
        let immunisation_program = InsertImmunisationProgram {
            id: "immunisation_program_to_delete".to_owned(),
            name: "immunisation_program_name".to_owned(),
        };

        let _result = service
            .insert_immunisation_program(&context, immunisation_program.clone())
            .unwrap();

        // Soft delete it
        let result = service.delete_immunisation_program(&context, immunisation_program.id.clone());

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), immunisation_program.id);

        // Ensure it is not visible in query
        let filter = ProgramFilter::new().id(EqualFilter::equal_to(&immunisation_program.id));

        let programs = service
            .get_programs(&context.connection, None, Some(filter), None)
            .unwrap();

        assert_eq!(programs.count, 0);
    }
}
