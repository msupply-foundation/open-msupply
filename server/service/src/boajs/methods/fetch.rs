use std::collections::HashMap;

use boa_engine::*;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use ts_rs::TS;

use crate::boajs::utils::*;

/// Input for the `fetch` global, loosely mirroring the browser `fetch` API but
/// synchronous (boajs has no event loop, see [`do_async_blocking`]).
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub(crate) struct FetchInput {
    url: String,
    /// HTTP method, defaults to `GET` when not provided.
    #[serde(default)]
    #[ts(optional)]
    method: Option<String>,
    #[serde(default)]
    #[ts(optional)]
    headers: Option<HashMap<String, String>>,
    /// Request body, sent as is. For json, stringify before passing in.
    #[serde(default)]
    #[ts(optional)]
    body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub(crate) struct FetchOutput {
    status: u16,
    /// True when status is in the 200-299 range.
    ok: bool,
    headers: HashMap<String, String>,
    /// Response body as text, use `JSON.parse` in plugin for json responses.
    body: String,
}

#[derive(Debug, Error)]
enum FetchError {
    #[error("Invalid http method: {0}")]
    InvalidMethod(String),
    #[error(transparent)]
    Reqwest(#[from] reqwest::Error),
}

pub(crate) fn bind_method(context: &mut Context) -> Result<(), JsError> {
    context.register_global_callable(
        JsString::from("fetch"),
        0,
        NativeFunction::from_copy_closure(move |_, args, ctx| {
            let input: FetchInput = get_serde_argument(ctx, args, 0)?;

            let output: FetchOutput = do_async_blocking(async move { do_fetch(input).await })
                .map_err(std_error_to_js_error)?
                .map_err(std_error_to_js_error)?;

            let value: serde_json::Value =
                serde_json::to_value(&output).map_err(std_error_to_js_error)?;
            // We return the moved variable as a `JsValue`.
            JsValue::from_json(&value, ctx)
        }),
    )?;
    Ok(())
}

async fn do_fetch(
    FetchInput {
        url,
        method,
        headers,
        body,
    }: FetchInput,
) -> Result<FetchOutput, FetchError> {
    let method = match method {
        Some(method) => reqwest::Method::from_bytes(method.to_uppercase().as_bytes())
            .map_err(|_| FetchError::InvalidMethod(method))?,
        None => reqwest::Method::GET,
    };

    // https_client uses bundled CA roots, matching the rest of the server (see util::tls)
    let mut request = util::https_client().request(method, url);

    if let Some(headers) = headers {
        for (key, value) in headers {
            request = request.header(key, value);
        }
    }

    if let Some(body) = body {
        request = request.body(body);
    }

    let response = request.send().await?;

    let status = response.status();
    let ok = status.is_success();
    let headers = response
        .headers()
        .iter()
        .filter_map(|(key, value)| value.to_str().ok().map(|v| (key.to_string(), v.to_string())))
        .collect();
    let body = response.text().await?;

    Ok(FetchOutput {
        status: status.as_u16(),
        ok,
        headers,
        body,
    })
}
