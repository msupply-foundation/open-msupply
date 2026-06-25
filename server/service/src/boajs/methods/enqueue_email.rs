use boa_engine::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{
    boajs::context::BoaJsContext,
    boajs::utils::*,
    email::enqueue::{enqueue_email, EnqueueEmailData},
};

/// Input for the `enqueue_email` global. Adds an email to the queue
/// (the `email_queue` table); the central server's scheduled task is what
/// actually sends it (see `email::send_queued_emails`).
///
/// Both bodies are sent as a `multipart/alternative` message, so the plugin
/// must supply both: `html_body` for html-capable clients and `text_body` as
/// the plain text fallback.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub(crate) struct EnqueueEmailInput {
    pub to_address: String,
    pub subject: String,
    pub html_body: String,
    pub text_body: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub(crate) struct EnqueueEmailOutput {
    /// Id of the queued email row.
    pub id: String,
}

pub(crate) fn bind_method(context: &mut Context) -> Result<(), JsError> {
    context.register_global_callable(
        JsString::from("enqueue_email"),
        0,
        NativeFunction::from_copy_closure(move |_, args, ctx| {
            let input: EnqueueEmailInput = get_serde_argument(ctx, args, 0)?;

            // When using BoaJsContext, it's best to use 'scope'
            let output: EnqueueEmailOutput = {
                let service_provider = BoaJsContext::service_provider();
                let connection = service_provider
                    .connection()
                    .map_err(std_error_to_js_error)?;

                let EnqueueEmailInput {
                    to_address,
                    subject,
                    html_body,
                    text_body,
                } = input;

                // EmailServiceError does not implement std::error::Error, so we
                // format it into a string rather than using std_error_to_js_error.
                let row = enqueue_email(
                    &connection,
                    EnqueueEmailData {
                        to_address,
                        subject,
                        html_body,
                        text_body,
                    },
                )
                .map_err(|e| string_to_js_error(&format!("{e:?}")))?;

                EnqueueEmailOutput { id: row.id }
            };

            let value: serde_json::Value =
                serde_json::to_value(&output).map_err(std_error_to_js_error)?;
            // We return the moved variable as a `JsValue`.
            JsValue::from_json(&value, ctx)
        }),
    )?;
    Ok(())
}

#[cfg(test)]
mod test {
    use actix_web::web::Data;
    use repository::{
        email_queue_row::EmailQueueRowRepository, mock::MockDataInserts, test_db::setup_all,
    };

    use crate::{
        boajs::{
            call_method,
            context::BoaJsContext,
            utils::{ExecuteGraphQlError, ExecuteGraphql},
        },
        service_provider::ServiceProvider,
    };

    // enqueue_email never calls graphql, but BoaJsContext::new requires an
    // ExecuteGraphql impl to bind the global context, so use a no-op stub.
    struct NoopGraphql;
    #[async_trait::async_trait]
    impl ExecuteGraphql for NoopGraphql {
        async fn execute_graphql(
            &self,
            _: &str,
            _: &str,
            _: serde_json::Value,
        ) -> Result<serde_json::Value, ExecuteGraphQlError> {
            unreachable!("enqueue_email does not use graphql")
        }
    }

    #[actix_rt::test]
    async fn test_boajs_enqueue_email() {
        let (_, _, connection_manager, _) =
            setup_all("test_boajs_enqueue_email", MockDataInserts::none()).await;

        let service_provider = Data::new(ServiceProvider::new(connection_manager));
        // call_method reads the service provider from the global BoaJsContext.
        BoaJsContext::new(&service_provider, NoopGraphql).bind();

        // A minimal plugin bundle: an exported function that calls the
        // enqueue_email global and returns its output, exactly as a real
        // backend plugin would.
        let bundle = r#"export function run(input) { return enqueue_email(input); }"#
            .as_bytes()
            .to_vec();

        let input = serde_json::json!({
            "to_address": "someone@example.com",
            "subject": "Hello from a plugin",
            "html_body": "<p>hi</p>",
            "text_body": "hi",
        });

        let output: serde_json::Value =
            call_method(input, vec!["run"], &bundle).expect("enqueue_email call failed");

        let id = output
            .get("id")
            .and_then(|v| v.as_str())
            .expect("output should contain an id")
            .to_string();

        // The row should now exist in the email_queue table with our values.
        let connection = service_provider.connection().unwrap();
        let row = EmailQueueRowRepository::new(&connection)
            .find_one_by_id(&id)
            .unwrap()
            .expect("queued email row should exist");

        assert_eq!(row.to_address, "someone@example.com");
        assert_eq!(row.subject, "Hello from a plugin");
        assert_eq!(row.html_body, "<p>hi</p>");
        assert_eq!(row.text_body, "hi");
    }
}
