use async_trait::async_trait;
use repository::{
    contact_form::{ContactForm, ContactFormFilter, ContactFormRepository},
    contact_form_row::ContactType,
    ChangelogRow, ChangelogTableName, EqualFilter, KeyType,
};
use tera::{Context, Tera};
use util::constants::{FEEDBACK_EMAIL, SUPPORT_EMAIL};

use crate::{
    email::{
        enqueue::{enqueue_email, EnqueueEmailData},
        EmailServiceError,
    },
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
    sync::CentralServerConfig,
};
use nanohtml2text::html2text;

const DESCRIPTION: &str = "Adds an email to the queue from a contact form";

pub(crate) struct QueueContactEmailProcessor;

#[async_trait]
impl Processor for QueueContactEmailProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Only runs once because contact form is create only
    /// Changelog will only be processed once
    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        _: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let connection = &ctx.connection;
        let filter = ContactFormFilter::new().id(EqualFilter::equal_to(&changelog.record_id));

        let contact_form = ContactFormRepository::new(connection)
            .query_one(filter)
            .map_err(ProcessorError::DatabaseError)?
            .ok_or(ProcessorError::RecordNotFound(
                "Contact Form".to_string(),
                changelog.record_id.clone(),
            ))?;

        let email = create_email(&contact_form);

        let email = match email {
            Ok(email) => email,
            Err(e) => {
                log::error!(
                    "Error creating for contact form {}: {:?}",
                    contact_form.contact_form_row.id,
                    e
                );
                return Err(ProcessorError::EmailServiceError(e));
            }
        };

        // add email to queue
        let enqueue = enqueue_email(connection, email);
        match enqueue {
            Ok(email) => {
                log::info!(
                    "Queued email {} for contact form {}",
                    email.id,
                    contact_form.contact_form_row.id
                );
            }
            Err(e) => {
                log::error!(
                    "Error queueing email for contact form {}: {:?}",
                    contact_form.contact_form_row.id,
                    e
                );
                return Ok(None);
            }
        };

        Ok(Some("success".to_string()))
    }

    fn change_log_table_names(&self) -> Vec<ChangelogTableName> {
        vec![ChangelogTableName::ContactForm]
    }

    fn cursor_type(&self) -> KeyType {
        KeyType::ContactFormProcessorCursor
    }

    // Only run on central server
    fn should_run(&self) -> bool {
        CentralServerConfig::is_central_server()
    }
}

fn create_email(contact_form: &ContactForm) -> Result<EnqueueEmailData, EmailServiceError> {
    let ContactForm {
        contact_form_row,
        store_row,
        name_row,
    } = &contact_form;

    let template_name = "contact.html";
    let base_html_template = include_str!("../../email/base.html");
    let html_template = include_str!("templates/contact.html");

    let mut tera = Tera::default();
    tera.add_raw_templates(vec![
        ("base.html", base_html_template),
        (template_name, html_template),
    ])
    .unwrap();

    let submission_time = contact_form_row
        .created_datetime
        .format("%H:%M %d-%m-%Y (UTC)")
        .to_string();
    let store_name = format!("{} ({})", name_row.name, store_row.code);

    let mut context = Context::new();
    context.insert("username", &contact_form_row.username);
    context.insert("reply_email", &contact_form_row.reply_email);
    context.insert("submission_time", &submission_time);
    context.insert("store_name", &store_name);
    context.insert("site_id", &store_row.site_id);
    context.insert("body", &contact_form_row.body);

    match contact_form_row.contact_type {
        ContactType::Feedback => {
            context.insert("contact_type", "Feedback Submission");
        }
        ContactType::Support => {
            context.insert("contact_type", "Support Request");
        }
    }

    let html_body = tera.render(template_name, &context);
    let html_body = match html_body {
        Ok(html_body) => html_body,
        Err(e) => {
            log::error!("Failed to render {}: {:?}", template_name, e);
            return Err(EmailServiceError::GenericError(e.to_string()));
        }
    };

    let to_address = match contact_form_row.contact_type {
        ContactType::Feedback => FEEDBACK_EMAIL.to_string(),
        ContactType::Support => SUPPORT_EMAIL.to_string(),
    };
    let subject = match contact_form_row.contact_type {
        ContactType::Feedback => format!("Feedback from {}", contact_form_row.username),
        ContactType::Support => format!("Support request from {}", contact_form_row.username),
    };

    let email = EnqueueEmailData {
        to_address,
        subject,
        html_body: html_body.clone(),
        text_body: html2text(&html_body),
    };

    Ok(email)
}

#[cfg(test)]
#[cfg(feature = "email-tests")]
mod email_test {
    use repository::{
        contact_form::ContactForm,
        contact_form_row::{ContactFormRow, ContactFormRowRepository, ContactType},
        email_queue_row::EmailQueueRowRepository,
        mock::{mock_name_store_a, mock_store_a, mock_user_account_a, MockData, MockDataInserts},
        ChangelogRow,
    };
    use util::constants::SUPPORT_EMAIL;

    use crate::{
        processors::contact_form::{ContactFormProcessor, QueueContactEmailProcessor},
        test_helpers::{
            email_test::send_test_emails, setup_all_with_data_and_service_provider,
            ServiceTestContext,
        },
    };

    use super::create_email;

    #[actix_rt::test]
    async fn test_create_quote_confirmation_email() {
        // This test pretty much just checks that the email renders without error

        let contact_form = ContactForm {
            contact_form_row: ContactFormRow {
                reply_email: "reply@test.com".to_string(),
                body: "Feedback message".to_string(),
                contact_type: ContactType::Feedback,
                user_id: mock_user_account_a().id,
                ..Default::default()
            },
            store_row: mock_store_a(),
            name_row: mock_name_store_a(),
        };

        let email = create_email(&contact_form);

        assert!(email.is_ok());

        let email_body = email.unwrap().text_body;

        assert!(email_body.contains("Feedback Submission"));
        assert!(email_body.contains("Reply email: reply@test.com"));
        assert!(email_body.contains("Store: Store A (code)"));
        assert!(email_body.contains("Feedback message"));
    }

    #[actix_rt::test]
    async fn send_contact_form_emails() {
        let ServiceTestContext {
            connection,
            service_provider,
            ..
        } = setup_all_with_data_and_service_provider(
            "send_contact_form_emails",
            MockDataInserts::all(),
            MockData::default(),
        )
        .await;

        ContactFormRowRepository::new(&connection)
            .upsert_one(&ContactFormRow {
                id: "contact_form_id".to_string(),
                reply_email: "reply@test.com".to_string(),
                body: "Some request for support".to_string(),
                username: "username_a".to_string(),
                contact_type: ContactType::Support,
                store_id: mock_store_a().id,
                ..Default::default()
            })
            .unwrap();

        let changelog = ChangelogRow {
            record_id: "contact_form_id".to_string(),
            ..Default::default()
        };

        QueueContactEmailProcessor
            .try_process_record(&connection, &changelog)
            .unwrap();

        // Check that the email was queued
        let repo = EmailQueueRowRepository::new(&connection);
        let unsent = repo.un_sent().unwrap();

        assert_eq!(unsent.len(), 1);
        assert_eq!(unsent[0].to_address, SUPPORT_EMAIL);
        assert!(unsent[0]
            .subject
            .contains("Support request from username_a"));

        send_test_emails(&service_provider);
    }
}
