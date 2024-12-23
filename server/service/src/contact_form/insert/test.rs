#[cfg(test)]
mod insert {
    use repository::mock::{mock_store_a, mock_user_account_a, MockDataInserts};
    use repository::test_db::setup_all;

    use crate::contact_form::insert::ContactType::Feedback;
    use crate::contact_form::insert::{InsertContactForm, InsertContactFormError};
    use crate::service_provider::ServiceProvider;

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

        let input: InsertContactForm = InsertContactForm {
            id: "test_id".to_string(),
            contact_type: Feedback,
            reply_email: "some@email.com".to_string(),
            body: "body".to_string(),
        };

        // EmailIsNotValid - no @ or domain
        assert_eq!(
            service.insert_contact_form(
                &context,
                store_id,
                InsertContactForm {
                    id: "test_id".to_string(),
                    reply_email: "not_an_email".to_string(),
                    body: "body".to_string(),
                    contact_type: Feedback,
                },
            ),
            Err(InsertContactFormError::EmailIsInvalid)
        );

        // EmailIsNotValid - no @
        assert_eq!(
            service.insert_contact_form(
                &context,
                store_id,
                InsertContactForm {
                    id: "test_id".to_string(),
                    reply_email: "not_an_email.com".to_string(),
                    body: "body".to_string(),
                    contact_type: Feedback,
                },
            ),
            Err(InsertContactFormError::EmailIsInvalid)
        );

        // EmailIsNotValid - no domain
        assert_eq!(
            service.insert_contact_form(
                &context,
                store_id,
                InsertContactForm {
                    id: "test_id".to_string(),
                    reply_email: "not_an_email@com".to_string(),
                    body: "body".to_string(),
                    contact_type: Feedback,
                },
            ),
            Err(InsertContactFormError::EmailIsInvalid)
        );

        // EmailDoesNotExist
        assert_eq!(
            service.insert_contact_form(
                &context,
                store_id,
                InsertContactForm {
                    id: "test_id".to_string(),
                    reply_email: "".to_string(),
                    body: "body".to_string(),
                    contact_type: Feedback,
                },
            ),
            Err(InsertContactFormError::EmailNotProvided)
        );

        //Body/Message does not exist
        assert_eq!(
            service.insert_contact_form(
                &context,
                store_id,
                InsertContactForm {
                    id: "test_id".to_string(),
                    reply_email: "abcd@eda.ca".to_string(),
                    body: "".to_string(),
                    contact_type: Feedback,
                },
            ),
            Err(InsertContactFormError::MessageNotProvided)
        );

        // Create contact form
        service
            .insert_contact_form(&context, store_id, input.clone())
            .unwrap();

        // try create a second time
        let result = service.insert_contact_form(&context, store_id, input);

        let expected_result = Err(InsertContactFormError::ContactFormAlreadyExists);

        // ContactFormAlreadyExists
        assert_eq!(result, expected_result);
    }

    #[actix_rt::test]
    async fn insert_contact_form_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_contact_form_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        let store_id = &mock_store_a().id;

        // Success - Create Contact Form
        let result = service_provider
            .contact_form_service
            .insert_contact_form(
                &context,
                store_id,
                InsertContactForm {
                    id: "test_id".to_string(),
                    reply_email: "test_email@msupply.foundation".to_string(),
                    body: "body".to_string(),
                    contact_type: Feedback,
                },
            )
            .unwrap();

        assert_eq!(result.id, "test_id");
    }
}
