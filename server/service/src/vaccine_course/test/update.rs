#[cfg(test)]
mod query {
    use repository::mock::{
        mock_demographic_indicator_a, mock_immunisation_program_a, mock_item_a, mock_item_b,
        MockDataInserts,
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
    use crate::vaccine_course::insert::InsertVaccineCourse;
    use crate::vaccine_course::update::{
        UpdateVaccineCourse, UpdateVaccineCourseError, VaccineCourseDoseInput,
        VaccineCourseItemInput,
    };

    #[actix_rt::test]
    async fn test_update_vaccine_course() {
        let (_, _connection, connection_manager, _) =
            setup_all("test_update_vaccine_course", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.vaccine_course_service;

        // Create a vaccine course
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

        // Setup some items and doses to add to the vaccine course

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
            dose_number: 1,
        };

        let dose2 = VaccineCourseDoseInput {
            id: "dose_id2".to_owned(),
            label: "Dose 2".to_owned(),
            dose_number: 2,
        };

        // 0 - Update the vaccine course with the items and doses

        let update = UpdateVaccineCourse {
            id: vaccine_course_insert_a.id.clone(),
            name: Some("new_name".to_owned()),
            vaccine_items: vec![item1.clone(), item2.clone()],
            doses: vec![dose1.clone(), dose2.clone()],
            demographic_indicator_id: Some(mock_demographic_indicator_a().id),
            coverage_rate: 100.0,
            is_active: true,
            wastage_rate: 0.1,
        };

        let result = service.update_vaccine_course(&context, update).unwrap();
        assert_eq!(result.name, "new_name");
        assert_eq!(
            result.demographic_indicator_id,
            Some(mock_demographic_indicator_a().id)
        );

        // Check there are two items for the vaccine_course
        let item_repo = VaccineCourseItemRepository::new(&context.connection);
        let item_filter = VaccineCourseItemFilter::new()
            .vaccine_course_id(EqualFilter::equal_to(&vaccine_course_insert_a.id));

        let count = item_repo.count(Some(item_filter.clone())).unwrap();
        assert_eq!(count, 2);

        // Check there are two doses for the vaccine_course

        let dose_repo = VaccineCourseDoseRepository::new(&context.connection);
        let dose_filter = VaccineCourseDoseFilter::new()
            .vaccine_course_id(EqualFilter::equal_to(&vaccine_course_insert_a.id));
        let count = dose_repo.count(Some(dose_filter.clone())).unwrap();
        assert_eq!(count, 2);

        // 1 - Remove one item and one dose

        let update = UpdateVaccineCourse {
            id: vaccine_course_insert_a.id.clone(),
            name: Some("new_name".to_owned()),
            vaccine_items: vec![item2],
            doses: vec![dose2],
            demographic_indicator_id: Some(mock_demographic_indicator_a().id),
            coverage_rate: 100.0,
            is_active: true,
            wastage_rate: 0.1,
        };
        let _result = service.update_vaccine_course(&context, update).unwrap();

        // Check there is one item for the vaccine_course
        let count = item_repo.count(Some(item_filter.clone())).unwrap();
        assert_eq!(count, 1);

        // Check there is one dose for the vaccine_course
        let count = dose_repo.count(Some(dose_filter.clone())).unwrap();
        assert_eq!(count, 1);

        // 2 - Remove item_1 and dose_1 and add item_2 and dose_2
        let update = UpdateVaccineCourse {
            id: vaccine_course_insert_a.id.clone(),
            name: Some("new_name".to_owned()),
            vaccine_items: vec![item1.clone()],
            doses: vec![dose1.clone()],
            demographic_indicator_id: Some(mock_demographic_indicator_a().id),
            coverage_rate: 100.0,
            is_active: true,
            wastage_rate: 0.1,
        };
        let _result = service.update_vaccine_course(&context, update).unwrap();

        // Check there is one item for the vaccine_course, and it's the right one
        let items = item_repo.query_by_filter(item_filter.clone()).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].vaccine_course_item.id, item1.id);

        // Check there is one dose for the vaccine_course, and it's the right one
        let doses = dose_repo.query_by_filter(dose_filter.clone()).unwrap();
        assert_eq!(doses.len(), 1);
        assert_eq!(doses[0].id, dose1.id);

        // 3 - Update the label for a vaccine course

        let dose1 = VaccineCourseDoseInput {
            label: "Dose 1 Updated".to_owned(),
            ..dose1
        };

        let update = UpdateVaccineCourse {
            id: vaccine_course_insert_a.id.clone(),
            name: Some("new_name".to_owned()),
            vaccine_items: vec![item1.clone()],
            doses: vec![dose1.clone()],
            demographic_indicator_id: Some(mock_demographic_indicator_a().id),
            coverage_rate: 100.0,
            is_active: true,
            wastage_rate: 0.1,
        };
        let _result = service.update_vaccine_course(&context, update).unwrap();

        // Check there is one dose for the vaccine_course, and it's the right one
        let doses = dose_repo.query_by_filter(dose_filter.clone()).unwrap();
        assert_eq!(doses.len(), 1);
        assert_eq!(doses[0].label, dose1.label);

        // 4 - Remove all items and doses
        let update = UpdateVaccineCourse {
            id: vaccine_course_insert_a.id.clone(),
            name: Some("new_name".to_owned()),
            vaccine_items: vec![],
            doses: vec![],
            demographic_indicator_id: Some(mock_demographic_indicator_a().id),
            coverage_rate: 100.0,
            is_active: true,
            wastage_rate: 0.1,
        };
        let _result = service.update_vaccine_course(&context, update).unwrap();

        // Check there are no items for the vaccine_course
        let count = item_repo.count(Some(item_filter.clone())).unwrap();
        assert_eq!(count, 0);

        // Check there are no doses for the vaccine_course
        let count = dose_repo.count(Some(dose_filter.clone())).unwrap();
        assert_eq!(count, 0);

        // 5 - Attempt to update a vaccine course to duplicate name for same program_id

        // insert new vaccine course

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

        let result = service
            .insert_vaccine_course(&context, vaccine_course_insert_b.clone())
            .unwrap();

        assert_eq!(result.id, vaccine_course_insert_b.id);

        // update vaccine course to new name

        let update = UpdateVaccineCourse {
            id: vaccine_course_insert_b.id.clone(),
            name: Some("new_name".to_owned()),
            vaccine_items: vec![],
            doses: vec![],
            demographic_indicator_id: Some(mock_demographic_indicator_a().id),
            coverage_rate: 100.0,
            is_active: true,
            wastage_rate: 0.1,
        };

        assert_eq!(
            service.update_vaccine_course(&context, update),
            Err(UpdateVaccineCourseError::VaccineCourseNameExistsForThisProgram),
        );
    }
}
