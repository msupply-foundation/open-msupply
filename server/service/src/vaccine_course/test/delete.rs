#[cfg(test)]
mod delete {
    use repository::mock::{mock_immunisation_program_a, MockDataInserts};
    use repository::test_db::setup_all;
    use repository::vaccine_course::vaccine_course::VaccineCourseFilter;
    use repository::vaccine_course::vaccine_course_dose::{
        VaccineCourseDoseFilter, VaccineCourseDoseRepository,
    };
    use repository::EqualFilter;

    use crate::service_provider::ServiceProvider;
    use crate::vaccine_course::delete::DeleteVaccineCourseError;
    use crate::vaccine_course::insert::InsertVaccineCourse;
    use crate::vaccine_course::update::VaccineCourseDoseInput;

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
            program_id: mock_immunisation_program_a().id.clone(),
            vaccine_items: vec![],
            doses: vec![VaccineCourseDoseInput {
                id: "dose_to_delete".to_string(),
                label: "dose_label".to_string(),
                min_age: 0.0,
                max_age: 1.0,
                min_interval_days: 0,
                custom_age_label: None,
            }],
            demographic_id: None,
            coverage_rate: 100.0,
            is_active: true,
            wastage_rate: 0.1,
        };

        let _result = service
            .insert_vaccine_course(&context, vaccine_course.clone())
            .unwrap();

        // Check it is found
        let course_filter =
            VaccineCourseFilter::new().id(EqualFilter::equal_to(&vaccine_course.id));

        let courses = service
            .get_vaccine_courses(&context.connection, None, Some(course_filter.clone()), None)
            .unwrap();

        assert_eq!(courses.count, 1);

        let dose_filter = VaccineCourseDoseFilter::new()
            .vaccine_course_id(EqualFilter::equal_to(&vaccine_course.id));

        let dose_repo = VaccineCourseDoseRepository::new(&context.connection);

        // Dose is found
        let doses = dose_repo.query_by_filter(dose_filter.clone()).unwrap();
        assert_eq!(doses.len(), 1);

        // Soft delete the vaccine course
        let result = service.delete_vaccine_course(&context, vaccine_course.id.clone());

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), vaccine_course.id);

        // Ensure it is not found in query
        let courses = service
            .get_vaccine_courses(&context.connection, None, Some(course_filter), None)
            .unwrap();

        assert_eq!(courses.count, 0);

        // Dose also not found
        let doses = dose_repo.query_by_filter(dose_filter).unwrap();
        assert_eq!(doses.len(), 0);
    }
}
