#[cfg(test)]
mod insert {
    use repository::mock::{
        mock_encounter_a, mock_immunisation_encounter_a, mock_name_1, mock_patient_b,
        mock_program_a, mock_stock_line_a, mock_stock_line_vaccine_item_a, mock_store_a,
        mock_user_account_a, mock_vaccination_a, mock_vaccine_course_a_dose_a,
        mock_vaccine_course_a_dose_b, mock_vaccine_course_a_dose_c, MockData, MockDataInserts,
    };
    use repository::test_db::{setup_all, setup_all_with_data};
    use repository::{
        EncounterRow, InvoiceFilter, InvoiceRepository, InvoiceStatus, InvoiceType,
        StockLineRowRepository,
    };

    use crate::contact_form::insert::{InsertContactForm, InsertContactFormError};
    use crate::service_provider::ServiceProvider;
    use crate::vaccination::insert::{InsertVaccination, InsertVaccinationError};

    #[actix_rt::test]
    async fn insert_contact_form_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_contact_form_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.contact_form_service;

        let store_id = &mock_store_a().id;

        let input = InsertContactForm {
            id: "test_id".to_string(),
            reply_email: "some_email".to_string(),
            body: "body".to_string(),
            store_id: mock_store_a().id,
            user_id: mock_user_account_a().id,
            ..Default::default()
        };

        // Create contact form
        service
            .insert_contact_form(&context, store_id, input.clone())
            .unwrap();

        // try create a second time
        let result = service.insert_contact_form(&context, store_id, input);

        let expected_result = Err(InsertContactFormError::ContactIdAlreadyExists);

        // ContactFormAlreadyExists
        assert_eq!(result, expected_result);
    }
}

//write other tests for validation
//success test - seperate
