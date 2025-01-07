use repository::{contact_form::ContactForm, contact_form_row::ContactType};
use tera::{Context, Tera};
use util::constants::{FEEDBACK_EMAIL, SUPPORT_EMAIL};

use crate::{
    email::{
        enqueue::{enqueue_email, EnqueueEmailData},
        EmailServiceError,
    },
    service_provider::ServiceContext,
};
use nanohtml2text::html2text;

use super::{ContactFormProcessor, ProcessContactFormError};

const DESCRIPTION: &str = "Adds an email to the queue from a contact form";

pub(crate) struct QueueContactEmailProcessor;

impl ContactFormProcessor for QueueContactEmailProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Only runs once because contact form is create only
    /// Changelog will only be processed once
    fn try_process_record(
        &self,
        ctx: &ServiceContext,
        contact_form: &ContactForm,
    ) -> Result<Option<String>, ProcessContactFormError> {
        // TODO... consts?
        let email = create_email(contact_form);

        let email = match email {
            Ok(email) => email,
            Err(e) => {
                log::error!(
                    "Error creating for contact form {}: {:?}",
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
                    "Queued email for contact form {}",
                    contact_form.contact_form_row.id
                );
            }
            Err(e) => {
                log::error!(
                    "Error queueing email for contact form {}: {:?}",
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

fn create_email(contact_form: &ContactForm) -> Result<EnqueueEmailData, EmailServiceError> {
    let ContactForm {
        contact_form_row,
        user_row,
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
        .format("%H:%M %d-%m-%Y")
        .to_string();
    let store_name = format!("{} ({})", name_row.name, store_row.code);

    let mut context = Context::new();
    context.insert("username", &user_row.username);
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
        ContactType::Feedback => format!("Feedback from {}", user_row.username),
        ContactType::Support => format!("Support request from {}", user_row.username),
    };

    let email = EnqueueEmailData {
        to_address,
        subject,
        html_body: html_body.clone(),
        text_body: html2text(&html_body),
    };

    Ok(email)
}
