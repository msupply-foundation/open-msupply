#[cfg(test)]
mod query {
    use repository::mock::{
        mock_demographic_indicator_a, mock_immunisation_program_a, mock_immunisation_program_b,
        mock_item_a, mock_item_b, MockDataInserts,
    };
    use repository::test_db::setup_all;
    use repository::vaccine_course::vaccine_course_dose::{
        VaccineCourseDoseFilter, VaccineCourseDoseRepository,
    };
    use repository::vaccine_course::vaccine_course_item::{
        VaccineCourseItemFilter, VaccineCourseItemRepository,
    };
    use repository::EqualFilter;

    use crate::service_provider::ServiceProvider;
    use crate::vaccine_course::insert::{InsertVaccineCourse, InsertVaccineCourseError};
    use crate::vaccine_course::update::{VaccineCourseDoseInput, VaccineCourseItemInput};

    #[actix_rt::test]
    async fn test_insert_vaccine_course() {
        let (_, _connection, connection_manager, _) =
            setup_all("test_insert_vaccine_course", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.vaccine_course_service;

        // 0 - Insert Vaccine Course

        let vaccine_course_insert_a = InsertVaccineCourse {
            id: "vaccine_course_id".to_owned(),
            name: "vaccine_course_name".to_owned(),
            program_id: mock_immunisation_program_a().id.clone(),
            vaccine_items: vec![],
            doses: vec![],
            demographic_indicator_id: None,
            coverage_rate: 100.0,
            is_active: true,
            wastage_rate: 0.1,
        };

        let _result = service
            .insert_vaccine_course(&context, vaccine_course_insert_a.clone())
            .unwrap();

        // 0 - Try insert new course with same name and same program_id

        let vaccine_course_insert_b = InsertVaccineCourse {
            id: "vaccine_course_id_b".to_owned(),
            name: "vaccine_course_name".to_owned(),
            program_id: mock_immunisation_program_a().id.clone(),
            vaccine_items: vec![],
            doses: vec![],
            demographic_indicator_id: None,
            coverage_rate: 100.0,
            is_active: true,
            wastage_rate: 0.1,
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
            vaccine_items: vec![],
            doses: vec![],
            demographic_indicator_id: None,
            coverage_rate: 100.0,
            is_active: true,
            wastage_rate: 0.1,
        };

        let result = service
            .insert_vaccine_course(&context, vaccine_course_insert_c.clone())
            .unwrap();

        assert_eq!(result.id, vaccine_course_insert_c.id);

        // 2 - Insert new course with indicators, dose, and items

        let item1 = VaccineCourseItemInput {
            id: "item_id".to_owned(),
            item_id: mock_item_a().id,
        };

        let item2 = VaccineCourseItemInput {
            id: "item_id2".to_owned(),
            item_id: mock_item_b().id,
        };

        let dose1 = VaccineCourseDoseInput {
            id: "dose_id1".to_owned(),
            label: "Dose 1".to_owned(),
            ..Default::default()
        };

        let dose2 = VaccineCourseDoseInput {
            id: "dose_id2".to_owned(),
            label: "Dose 2".to_owned(),
            ..Default::default()
        };

        let vaccine_course_insert_d = InsertVaccineCourse {
            id: "vaccine_course_id_d".to_owned(),
            name: "vaccine_course_name_d".to_owned(),
            program_id: mock_immunisation_program_b().id.clone(),
            vaccine_items: vec![item1.clone(), item2.clone()],
            doses: vec![dose1.clone(), dose2.clone()],
            demographic_indicator_id: Some(mock_demographic_indicator_a().id),
            coverage_rate: 100.0,
            is_active: true,
            wastage_rate: 0.1,
        };

        let result = service
            .insert_vaccine_course(&context, vaccine_course_insert_d.clone())
            .unwrap();

        assert_eq!(
            result.demographic_indicator_id,
            Some(mock_demographic_indicator_a().id)
        );

        // Check there are two items for the vaccine_course
        let item_repo = VaccineCourseItemRepository::new(&context.connection);
        let item_filter = VaccineCourseItemFilter::new()
            .vaccine_course_id(EqualFilter::equal_to(&vaccine_course_insert_d.id));

        let count = item_repo.count(Some(item_filter.clone())).unwrap();
        assert_eq!(count, 2);

        // Check there are two doses for the vaccine_course

        let dose_repo = VaccineCourseDoseRepository::new(&context.connection);
        let dose_filter = VaccineCourseDoseFilter::new()
            .vaccine_course_id(EqualFilter::equal_to(&vaccine_course_insert_d.id));
        let count = dose_repo.count(Some(dose_filter.clone())).unwrap();
        assert_eq!(count, 2);
    }
}
