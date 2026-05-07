use std::time::{Duration, Instant};

use reqwest::*;

pub struct RetrySeconds(Vec<u64>);

impl Default for RetrySeconds {
    fn default() -> Self {
        Self(vec![
            /* first retry */ 2, /* second retry */ 5, /* third retry */ 10,
        ])
    }
}

// If a request burns more than this on a single attempt and times out, do not
// retry it — the overall request timeout has effectively been hit and another
// 30-minute attempt is unlikely to succeed where the first didn't, and we don't
// want a single sync to block for ~90 minutes. Fast timeouts (connect-phase,
// kernel TCP retransmit, etc.) still retry as before.
const SLOW_TIMEOUT_RETRY_CUTOFF: Duration = Duration::from_secs(60 * 25);

pub async fn with_retries<F>(connection_timeouts: RetrySeconds, f: F) -> Result<Response>
where
    F: Fn(Client) -> RequestBuilder,
{
    let mut index = 0;
    loop {
        let client = Client::builder()
            .connect_timeout(Duration::from_secs(connection_timeouts.0[index]))
            // generous because some sync records may have big payloads like reports that take a long time to sync on low bandwidth
            // we also had issues with batch size = 500 taking more then 5 minutes to generate during testing, maybe due to 4d flushing
            .timeout(Duration::from_secs(60 * 30))
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
                    "request timeout"
                } else {
                    "request error"
                };
                Some(format!("{}: {}", kind, e))
            }
        };

        let timeout_was_slow = is_timeout_error && elapsed >= SLOW_TIMEOUT_RETRY_CUTOFF;
        let will_retry = (is_connect_error
            || (is_timeout_error && !timeout_was_slow)
            || status == Some(StatusCode::REQUEST_TIMEOUT))
            && (index + 1) < connection_timeouts.0.len();

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
