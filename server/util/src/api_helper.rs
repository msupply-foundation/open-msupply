use std::{
    sync::RwLock,
    time::{Duration, Instant},
};

use reqwest::*;

pub struct RetrySeconds(Vec<u64>);

impl Default for RetrySeconds {
    fn default() -> Self {
        Self(vec![
            /* first retry */ 2, /* second retry */ 5, /* third retry */ 10,
        ])
    }
}

pub const DEFAULT_READ_IDLE_TIMEOUT: Duration = Duration::from_secs(60 * 5);

// Idle read timeout: abort if no bytes arrive on the response for this long.
// Configurable at runtime via set_read_idle_timeout so low-bandwidth sites
// can tune it from the UI without editing the server config file.
static READ_IDLE_TIMEOUT: RwLock<Duration> = RwLock::new(DEFAULT_READ_IDLE_TIMEOUT);

pub fn set_read_idle_timeout(d: Duration) {
    *READ_IDLE_TIMEOUT.write().unwrap() = d;
}

pub async fn with_retries<F>(connection_timeouts: RetrySeconds, f: F) -> Result<Response>
where
    F: Fn(Client) -> RequestBuilder,
{
    let mut index = 0;
    loop {
        let client = Client::builder()
            .connect_timeout(Duration::from_secs(connection_timeouts.0[index]))
            .read_timeout(*READ_IDLE_TIMEOUT.read().unwrap())
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

        let (status, is_connect_error, is_timeout_error, url) = match result.as_ref() {
            Ok(r) => (Some(r.status()), false, false, Some(r.url().to_string())),
            Err(e) => (
                e.status(),
                e.is_connect(),
                e.is_timeout(),
                e.url().map(|u| u.to_string()),
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
                } else {
                    "request error"
                };
                Some(format!("{}: {}", kind, e))
            }
        };

        let will_retry = (is_connect_error
            || is_timeout_error
            || status == Some(StatusCode::REQUEST_TIMEOUT))
            && (index + 1) < connection_timeouts.0.len();

        if let Ok(response) = result.as_ref() {
            let content_length_display = response
                .content_length()
                .map(|n| format!("{} bytes", n))
                .unwrap_or_else(|| "unknown".to_string());
            log::info!(
                "API response: url '{}', status {}, content-length {}, headers in {:.1}s",
                response.url(),
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
            log::info!(
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
