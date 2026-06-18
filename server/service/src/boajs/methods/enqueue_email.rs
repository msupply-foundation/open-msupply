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
