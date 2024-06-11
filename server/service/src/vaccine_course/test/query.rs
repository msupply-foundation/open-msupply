#[cfg(test)]
mod query {
    use repository::mock::{mock_demographic_indicator_a, mock_program_a, MockDataInserts};
    use repository::StringFilter;
    use repository::{
        test_db::setup_all,
        vaccine_course::vaccine_course::{
            VaccineCourseFilter, VaccineCourseSort, VaccineCourseSortField,
        },
    };

    use crate::vaccine_course::insert::InsertVaccineCourse;
    use crate::{service_provider::ServiceProvider, SingleRecordError};

    #[actix_rt::test]
    async fn vaccine_course_service_single_record() {
        let (_, _, connection_manager, _) =
            setup_all("test_vaccine_course_single_record", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.vaccine_course_service;

        // Create a vaccine course
        let vaccine_course_insert = InsertVaccineCourse {
            id: "vaccine_course_id".to_owned(),
            name: "vaccine_course_name".to_owned(),
            program_id: mock_program_a().id.clone(),
        };

        let _result = service
            .insert_vaccine_course(&context, vaccine_course_insert.clone())
            .unwrap();

        assert_eq!(
            service.get_vaccine_course(&context.connection, "invalid_id".to_owned()),
            Err(SingleRecordError::NotFound("invalid_id".to_owned()))
        );

        let result = service
            .get_vaccine_course(&context.connection, vaccine_course_insert.id.clone())
            .unwrap();

        assert_eq!(result.id, vaccine_course_insert.id);
    }

    #[actix_rt::test]
    async fn vaccine_course_service_filter() {
        let (_, connection, connection_manager, _) =
            setup_all("test_vaccine_course_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.vaccine_course_service;

        // Create 2 vaccine courses
        let vaccine_course_insert_a = InsertVaccineCourse {
            id: "vaccine_course_id".to_owned(),
            name: "vaccine_course_name".to_owned(),
            program_id: mock_program_a().id.clone(),
        };

        let _result = service
            .insert_vaccine_course(&context, vaccine_course_insert_a.clone())
            .unwrap();

        let vaccine_course_insert_b = InsertVaccineCourse {
            id: "vaccine_course_id_b".to_owned(),
            name: "vaccine_course_name_b".to_owned(),
            program_id: mock_program_a().id.clone(),
        };

        let _result = service
            .insert_vaccine_course(&context, vaccine_course_insert_b.clone())
            .unwrap();

        let result = service
            .get_vaccine_courses(
                &connection,
                None,
                Some(VaccineCourseFilter::new().name(StringFilter::like("vaccine_course_name"))),
                Some(VaccineCourseSort {
                    key: VaccineCourseSortField::Name,
                    desc: Some(false),
                }),
            )
            .unwrap();

        assert_eq!(result.count, 2);
        assert_eq!(result.rows[0].id, vaccine_course_insert_a.id);
        assert_eq!(result.rows[1].id, vaccine_course_insert_b.id);
    }
}
