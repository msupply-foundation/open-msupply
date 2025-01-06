use repository::{contact_form::ContactForm, contact_form_row::ContactType};
use tera::{Context, Tera};

use crate::{
    email::{
        enqueue::{enqueue_email, EnqueueEmailData},
        EmailServiceError,
    },
    service_provider::ServiceContext,
};
use nanohtml2text::html2text;

use super::{ContactFormProcessor, ProcessContactFormError};

const DESCRIPTION: &str = "Adds a feedback email to the queue from feedback contact forms";

pub(crate) struct QueueFeedbackEmailProcessor;

impl ContactFormProcessor for QueueFeedbackEmailProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Feedback email will be queued when:
    ///
    /// - Form is of type Feedback
    ///
    /// Only runs once because contact form is create only
    /// Changelog will only be processed once
    fn try_process_record(
        &self,
        ctx: &ServiceContext,
        contact_form: &ContactForm,
    ) -> Result<Option<String>, ProcessContactFormError> {
        if !matches!(
            contact_form.contact_form_row.contact_type,
            ContactType::Feedback
        ) {
            return Ok(None);
        }

        // TODO... consts?
        let email = create_feedback_email("feedback@msupply.foundation".to_string(), contact_form);

        let email = match email {
            Ok(email) => email,
            Err(e) => {
                log::error!(
                    "Error creating feedback email for contact form {}: {:?}",
                    contact_form.contact_form_row.id,
                    e
                );
                return Err(ProcessContactFormError::EmailServiceError(e));
            }
        };

        // add email to queue
        let enqueue = enqueue_email(ctx, email);
        match enqueue {
            Ok(_) => {
                log::info!(
                    "Queued feedback email for contact form {}",
                    contact_form.contact_form_row.id
                );
            }
            Err(e) => {
                log::error!(
                    "Error queueing feedback email for contact form {}: {:?}",
                    contact_form.contact_form_row.id,
                    e
                );
            }
        }

        // system_activity_log_entry(
        //     connection,
        //     ActivityLogType::EmailQueued,
        //     &new_inbound_invoice.store_id,
        //     &new_inbound_invoice.id,
        // )?;

        Ok(Some("success".to_string()))
    }
}

fn create_feedback_email(
    to: String,
    contact_form: &ContactForm,
) -> Result<EnqueueEmailData, EmailServiceError> {
    let ContactForm {
        contact_form_row,
        user_row,
        store_row,
        name_row,
    } = &contact_form;

    let subject = format!("Feedback from {}", user_row.username);
    let template_name = "feedback.html";

    let submission_time = contact_form_row
        .created_datetime
        .format("%H:%M %d-%m-%Y")
        .to_string();
    let store_name = format!("{} ({})", name_row.name, store_row.code);

    let base_html_template = include_str!("../../email/base.html");
    let html_template = include_str!("templates/feedback.html");

    let mut tera = Tera::default();
    tera.add_raw_templates(vec![
        ("base.html", base_html_template),
        (template_name, html_template),
    ])
    .unwrap();

    let mut context = Context::new();
    context.insert("username", &user_row.username);
    context.insert("reply_email", &contact_form_row.reply_email);
    context.insert("submission_time", &submission_time);
    context.insert("store_name", &store_name);
    context.insert("site_id", &store_row.site_id);
    context.insert("body", &contact_form_row.body);

    let html_body = tera.render(template_name, &context);
    let html_body = match html_body {
        Ok(html_body) => html_body,
        Err(e) => {
            log::error!("Failed to render {}: {:?}", template_name, e);
            return Err(EmailServiceError::GenericError(e.to_string()));
        }
    };

    let email = EnqueueEmailData {
        to_address: to,
        subject,
        html_body: html_body.clone(),
        text_body: html2text(&html_body),
    };

    Ok(email)
}
