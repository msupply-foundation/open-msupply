#[cfg(test)]
mod query {
    use repository::mock::{
        mock_demographic_indicator_a, mock_immunisation_program_a, mock_immunisation_program_b,
        mock_item_a, mock_item_b, MockDataInserts,
    };
    use repository::test_db::setup_all;

    use crate::service_provider::ServiceProvider;
    use crate::vaccine_course::insert::{InsertVaccineCourse, InsertVaccineCourseError};
    use crate::vaccine_course::update::{VaccineCourseItem, VaccineCourseSchedule};

    #[actix_rt::test]
    async fn test_update_vaccine_course() {
        let (_, _connection, connection_manager, _) =
            setup_all("test_update_vaccine_course", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.vaccine_course_service;

        // 0 - Insert Vaccine Course

        let vaccine_course_insert_a = InsertVaccineCourse {
            id: "vaccine_course_id".to_owned(),
            name: "vaccine_course_name".to_owned(),
            program_id: mock_immunisation_program_a().id.clone(),
        };

        let _result = service
            .insert_vaccine_course(&context, vaccine_course_insert_a.clone())
            .unwrap();

        let item1 = VaccineCourseItem {
            id: "item_id".to_owned(),
            item_id: mock_item_a().id,
        };

        let item2 = VaccineCourseItem {
            id: "item_id2".to_owned(),
            item_id: mock_item_b().id,
        };

        let schedule1 = VaccineCourseSchedule {
            id: "schedule_id1".to_owned(),
            label: "Dose 1".to_owned(),
            dose_number: 1,
        };

        let schedule2 = VaccineCourseSchedule {
            id: "schedule_id2".to_owned(),
            label: "Dose 2".to_owned(),
            dose_number: 2,
        };

        // 0 - Try insert new course with same name and same program_id

        let vaccine_course_insert_b = InsertVaccineCourse {
            id: "vaccine_course_id_b".to_owned(),
            name: "vaccine_course_name".to_owned(),
            program_id: mock_immunisation_program_a().id.clone(),
        };

        assert_eq!(
            service.insert_vaccine_course(&context, vaccine_course_insert_b),
            Err(InsertVaccineCourseError::VaccineCourseNameExistsForThisProgram)
        );

        // 1 - Insert new course with same name on new program_id

        let vaccine_course_insert_c = InsertVaccineCourse {
            id: "vaccine_course_id_c".to_owned(),
            name: "vaccine_course_name".to_owned(),
            program_id: mock_immunisation_program_b().id.clone(),
        };

        let result = service
            .insert_vaccine_course(&context, vaccine_course_insert_c.clone())
            .unwrap();

        assert_eq!(result.id, vaccine_course_insert_c.id);
    }
}
