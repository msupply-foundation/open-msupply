#[cfg(test)]
mod delete {
    use repository::mock::{mock_immunisation_program, MockDataInserts};
    use repository::test_db::setup_all;

    use crate::service_provider::ServiceProvider;
    use crate::vaccine_course::delete::DeleteVaccineCourseError;
    use crate::vaccine_course::insert::InsertVaccineCourse;

    #[actix_rt::test]
    async fn delete_vaccine_course_errors() {
        let (_, _, connection_manager, _) =
            setup_all("delete_vaccine_course_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.vaccine_course_service;

        assert_eq!(
            service.delete_vaccine_course(&context, "invalid_id".to_owned()),
            Err(DeleteVaccineCourseError::VaccineCourseDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn delete_vaccine_course_success() {
        let (_, _, connection_manager, _) =
            setup_all("delete_vaccine_course_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.vaccine_course_service;

        // Create vaccine course
        let vaccine_course = InsertVaccineCourse {
            id: "vaccine_course_to_delete".to_owned(),
            name: "vaccine_course_name".to_owned(),
            program_id: mock_immunisation_program().id.clone(),
        };

        let _result = service
            .insert_vaccine_course(&context, vaccine_course.clone())
            .unwrap();

        let result = service.delete_vaccine_course(&context, vaccine_course.id.clone());

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), vaccine_course.id);
    }
}
