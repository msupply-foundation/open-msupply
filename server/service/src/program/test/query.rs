#[cfg(test)]
mod query {
    use repository::mock::MockDataInserts;
    use repository::test_db::setup_all;
    use repository::{
        ProgramFilter, ProgramRow, ProgramRowRepository, ProgramSort, ProgramSortField,
        StringFilter,
    };
    use util::constants::IMMUNISATION_CONTEXT_ID;

    use crate::{service_provider::ServiceProvider, SingleRecordError};

    #[actix_rt::test]
    async fn program_service_single_record() {
        let (_, _, connection_manager, _) =
            setup_all("test_program_single_record", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.program_service;

        // Create an immunisation program
        let program_insert = ProgramRow {
            id: "program_id".to_owned(),
            name: "program_name".to_owned(),
            master_list_id: None,
            context_id: IMMUNISATION_CONTEXT_ID.to_string(),
            is_immunisation: true,
        };

        ProgramRowRepository::new(&context.connection)
            .upsert_one(&program_insert)
            .unwrap();

        assert_eq!(
            service.get_program(&context.connection, "invalid_id".to_owned()),
            Err(SingleRecordError::NotFound("invalid_id".to_owned()))
        );

        let result = service
            .get_program(&context.connection, program_insert.id.clone())
            .unwrap();

        assert_eq!(result.id, program_insert.id);
    }

    #[actix_rt::test]
    async fn program_service_filter() {
        let (_, connection, connection_manager, _) =
            setup_all("test_program_filter", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.program_service;

        // Create 2 immunisation programs
        let program_insert_a = ProgramRow {
            id: "program_id_a".to_owned(),
            name: "program_name_a".to_owned(),
            master_list_id: None,
            context_id: IMMUNISATION_CONTEXT_ID.to_string(),
            is_immunisation: true,
        };
        let program_insert_b = ProgramRow {
            id: "program_id_b".to_owned(),
            name: "program_name_b".to_owned(),
            master_list_id: None,
            context_id: IMMUNISATION_CONTEXT_ID.to_string(),
            is_immunisation: true,
        };

        let repo = ProgramRowRepository::new(&context.connection);
        repo.upsert_one(&program_insert_a).unwrap();
        repo.upsert_one(&program_insert_b).unwrap();

        let result = service
            .get_programs(
                &connection,
                None,
                Some(ProgramFilter::new().name(StringFilter::like("program_name_a"))),
                Some(ProgramSort {
                    key: ProgramSortField::Name,
                    desc: Some(false),
                }),
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].id, program_insert_a.id);
    }
}
