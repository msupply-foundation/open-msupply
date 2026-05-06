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

        if (is_connect_error
            || is_timeout_error
            || status == Some(StatusCode::REQUEST_TIMEOUT))
            && (index + 1) < connection_timeouts.0.len()
        {
            let reason = if is_connect_error {
                "connection error"
            } else if is_timeout_error {
                "request timeout"
            } else {
                "HTTP 408 Request Timeout"
            };
            let url_display = url.as_deref().unwrap_or("<unknown>");
            let next_timeout = connection_timeouts.0[index + 1];
            let body_display = body_size
                .map(|n| format!("{} bytes", n))
                .unwrap_or_else(|| "unknown size".to_string());
            log::info!(
                "API request retry {}/{} for url '{}' due to {} after {:.1}s (request body: {}); next connect timeout {}s",
                index + 1,
                connection_timeouts.0.len() - 1,
                url_display,
                reason,
                elapsed.as_secs_f64(),
                body_display,
                next_timeout
            );
            index += 1;
            continue;
        }

        break result;
    }
}
