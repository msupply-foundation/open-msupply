use std::time::{Duration, Instant};

use reqwest::*;

use crate::https_client_builder;

/// Returns the URL with the query string and fragment stripped, so it can be
/// safely written to logs. Some endpoints (e.g. PatientApiV4) include patient
/// names, DOB, policy number, etc. in the query string — never log those.
pub fn redact_url_for_log(url: &Url) -> String {
    let mut redacted = url.clone();
    redacted.set_query(None);
    redacted.set_fragment(None);
    redacted.to_string()
}

pub struct RetrySeconds(Vec<u64>);

impl Default for RetrySeconds {
    fn default() -> Self {
        Self(vec![
            /* first retry */ 2, /* second retry */ 5, /* third retry */ 10,
        ])
    }
}

// Idle read timeout: abort if no bytes arrive on the response for this long.
// Replaces the previous 30-minute wall-clock cap so legitimate large pulls
// (which can exceed 30 min on low bandwidth) still succeed as long as the
// connection is making progress; a genuinely stalled socket still fails fast.
const READ_IDLE_TIMEOUT: Duration = Duration::from_secs(60 * 5);

pub async fn with_retries<F>(connection_timeouts: RetrySeconds, f: F) -> Result<Response>
where
    F: Fn(Client) -> RequestBuilder,
{
    with_retries_opts(connection_timeouts, true, f).await
}

/// As [`with_retries`], but `retry_on_idle_timeout` controls whether an idle read timeout
/// (or 408) triggers a retry. Pass `false` for long-running endpoints whose server-side
/// work continues after the client gives up (e.g. legacy sync v5): retrying there spawns
/// an overlapping server-side request for the same site, which the central then rejects as
/// "sync already running". Connect errors are always retried (no server-side work began).
pub async fn with_retries_opts<F>(
    connection_timeouts: RetrySeconds,
    retry_on_idle_timeout: bool,
    f: F,
) -> Result<Response>
where
    F: Fn(Client) -> RequestBuilder,
{
    let mut index = 0;
    loop {
        let client = https_client_builder()
            .connect_timeout(Duration::from_secs(connection_timeouts.0[index]))
            .read_timeout(READ_IDLE_TIMEOUT)
            .build()
            .unwrap(); // This method fails if a TLS backend cannot be initialized, or the resolver cannot load the system configuration.

        // Build the request up-front so we can inspect the body size for diagnostic
        // logging on retry. `as_bytes()` returns None for streaming bodies (none of our
        // current call sites use streaming, but the helper is generic).
        let request_result = f(client.clone()).build();
        let body_size = request_result
            .as_ref()
            .ok()
            .and_then(|r| r.body())
            .and_then(|b| b.as_bytes())
            .map(|b| b.len());

        let started = Instant::now();
        let result = match request_result {
            Ok(request) => client.execute(request).await,
            Err(e) => Err(e),
        };
        let elapsed = started.elapsed();

        let (status, is_connect_error, is_timeout_error, is_dropped_connection, url) =
            match result.as_ref() {
                Ok(r) => (
                    Some(r.status()),
                    false,
                    false,
                    false,
                    Some(redact_url_for_log(r.url())),
                ),
                Err(e) => (
                    e.status(),
                    e.is_connect(),
                    e.is_timeout(),
                    is_connection_dropped(e),
                    e.url().map(redact_url_for_log),
                ),
            };

        // Surface the status code (or transport error) for any failed attempt so
        // proxy/upstream errors like 502/503/504 — which we do not currently retry —
        // still appear in the log instead of being hidden behind a downstream
        // "could not parse response" message.
        let attempt_failure = match result.as_ref() {
            Ok(r) if !r.status().is_success() => Some(format!("HTTP {}", r.status().as_u16())),
            Ok(_) => None,
            Err(e) => {
                let kind = if is_connect_error {
                    "connection error"
                } else if is_timeout_error {
                    "idle timeout"
                } else if is_dropped_connection {
                    "connection dropped"
                } else {
                    "request error"
                };
                Some(format!("{}: {}", kind, e))
            }
        };

        let idle_timeout = is_timeout_error || status == Some(StatusCode::REQUEST_TIMEOUT);
        // A mid-flight connection drop (e.g. hyper `IncompleteMessage`) is retried only for endpoints
        // opting in via `retry_on_idle_timeout` (idempotent reads/upserts like v6); v5 keeps it off to
        // avoid overlapping an in-flight server-side request. Connect errors are always retried.
        let will_retry = (is_connect_error
            || (retry_on_idle_timeout && (idle_timeout || is_dropped_connection)))
            && (index + 1) < connection_timeouts.0.len();

        if let Ok(response) = result.as_ref() {
            let content_length_display = response
                .content_length()
                .map(|n| format!("{} bytes", n))
                .unwrap_or_else(|| "unknown".to_string());
            log::info!(
                "API response: url '{}', status {}, content-length {}, headers in {:.1}s",
                redact_url_for_log(response.url()),
                response.status().as_u16(),
                content_length_display,
                elapsed.as_secs_f64(),
            );
        }

        if let Some(failure) = attempt_failure {
            let url_display = url.as_deref().unwrap_or("<unknown>");
            let body_display = body_size
                .map(|n| format!("{} bytes", n))
                .unwrap_or_else(|| "unknown size".to_string());
            let retry_note = if will_retry {
                format!(
                    "retrying (next connect timeout {}s)",
                    connection_timeouts.0[index + 1]
                )
            } else {
                "not retrying".to_string()
            };
            log::warn!(
                "API request failed: url '{}', {}, attempt {}/{} after {:.1}s (request body: {}); {}",
                url_display,
                failure,
                index + 1,
                connection_timeouts.0.len(),
                elapsed.as_secs_f64(),
                body_display,
                retry_note,
            );
        }

        if will_retry {
            index += 1;
            continue;
        }

        break result;
    }
}

/// True if the server dropped an established connection mid-response (hyper `IncompleteMessage`,
/// reset, broken pipe) - distinct from `is_connect`/`is_timeout`, and safe to retry for idempotent
/// requests.
fn is_connection_dropped(error: &reqwest::Error) -> bool {
    // Only request-phase transport errors; never status / decode / body errors.
    error.is_request() && chain_contains_transient_drop(error)
}

/// Walk the error's source chain looking for a transient transport-drop signature.
///
/// Public so callers that read a response body *after* the retry loop above has returned
/// (the body is read by the caller, not here) can classify the same failure the same way -
/// see `ParsingResponseError::from_body_read_error` in the sync api.
pub fn chain_contains_transient_drop(error: &(dyn std::error::Error + 'static)) -> bool {
    // hyper renders `IncompleteMessage` as "connection closed before message completed".
    const SIGNATURES: [&str; 6] = [
        "connection closed before message completed",
        "incompletemessage",
        "connection reset",
        "broken pipe",
        "unexpected end of file",
        // hyper's `IncompleteBody`: the body ended before Content-Length was reached, i.e.
        // the response was cut short. Same failure as a reset, just a clean FIN.
        "end of file before message length reached",
    ];

    let mut current: Option<&(dyn std::error::Error + 'static)> = Some(error);
    while let Some(err) = current {
        let message = err.to_string().to_lowercase();
        if SIGNATURES.iter().any(|signature| message.contains(signature)) {
            return true;
        }
        current = err.source();
    }
    false
}

#[cfg(test)]
mod test {
    use super::chain_contains_transient_drop;
    use std::error::Error;
    use std::fmt;

    #[derive(Debug)]
    struct ChainError {
        message: String,
        source: Option<Box<ChainError>>,
    }

    impl fmt::Display for ChainError {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            write!(f, "{}", self.message)
        }
    }

    impl Error for ChainError {
        fn source(&self) -> Option<&(dyn Error + 'static)> {
            self.source
                .as_ref()
                .map(|boxed| boxed.as_ref() as &(dyn Error + 'static))
        }
    }

    fn chain(messages: &[&str]) -> ChainError {
        // Build innermost-first so the outer error's source points inward.
        let mut current: Option<Box<ChainError>> = None;
        for message in messages.iter().rev() {
            current = Some(Box::new(ChainError {
                message: message.to_string(),
                source: current,
            }));
        }
        *current.unwrap()
    }

    #[test]
    fn detects_incomplete_message_deep_in_chain() {
        // Mirrors the real reqwest -> hyper chain we saw on a dropped v6 pull.
        let error = chain(&[
            "error sending request for url (http://host/central/sync/pull)",
            "client error (SendRequest)",
            "connection closed before message completed",
        ]);
        assert!(chain_contains_transient_drop(&error));
    }

    #[test]
    fn detects_connection_reset() {
        let error = chain(&["error sending request", "Connection reset by peer (os error 54)"]);
        assert!(chain_contains_transient_drop(&error));
    }

    /// The chain reported from the field when a central server reset the connection
    /// part-way through streaming a `/sync/v5/central_records` batch body. The drop
    /// happens while *reading the body*, so it surfaces as a decode/body error rather
    /// than the request-phase error `detects_connection_reset` covers.
    #[test]
    fn detects_body_read_reset() {
        let error = chain(&[
            "error decoding response body",
            "request or response body error",
            "error reading a body from connection",
            "Connection reset by peer (os error 104)",
        ]);
        assert!(chain_contains_transient_drop(&error));
    }

    /// A body cut short with a clean FIN rather than a reset: hyper reports
    /// `IncompleteBody` and the chain otherwise matches `detects_body_read_reset`.
    #[test]
    fn detects_truncated_body() {
        let error = chain(&[
            "error decoding response body",
            "request or response body error",
            "error reading a body from connection",
            "end of file before message length reached",
        ]);
        assert!(chain_contains_transient_drop(&error));
    }

    #[test]
    fn ignores_non_transient_errors() {
        // A connect refusal is handled by `is_connect`, not here; a status/body error must not match.
        let connect = chain(&["error sending request", "tcp connect error", "Connection refused (os error 111)"]);
        assert!(!chain_contains_transient_drop(&connect));

        let bad_request = chain(&["builder error", "invalid header value"]);
        assert!(!chain_contains_transient_drop(&bad_request));
    }
}
