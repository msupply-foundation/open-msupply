use std::{
    future::{Ready, ready},
    sync::LazyLock,
};

use actix_web::{
    Error,
    dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready},
    http::header::{self, HeaderMap, HeaderName, HeaderValue},
};
use base64::{Engine, prelude::BASE64_STANDARD};
use futures_util::future::LocalBoxFuture;
use regex::Regex;
use sha2::{Digest, Sha256};

/// Policy for the app pages (both front ends) and the API. Scripts and outbound requests are
/// limited to our own origin, so a script that does get injected can't load more code from, or
/// send data to, another host. The one exception is the Zebra Browser Print service on the user's
/// own machine (http on 9100, https on 9101), which label printing talks to. Inline styles stay
/// allowed: the React front end's MUI/emotion styling and printed reports both rely on them.
///
/// `script-src` keeps `'unsafe-eval'`: JSON Forms / AJV compile every document-form validator with
/// `new Function(...)` (ajv/dist/compile/index.js), so without it the old UI's patient, encounter
/// and program-enrolment forms throw on open and the Solid front end silently loses its
/// client-side validation. This is a narrower relaxation than `'unsafe-inline'` would be: injected
/// code still can't be loaded from, or send data to, another host (`connect-src`, `img-src` and
/// the script hosts stay locked down), so the data-exfiltration path #1669 is about stays closed.
const APP_POLICY: &str = "default-src 'self'; \
    script-src 'self' 'unsafe-eval'; \
    style-src 'self' 'unsafe-inline'; \
    img-src 'self' data: blob:; \
    font-src 'self' data:; \
    connect-src 'self' http://127.0.0.1:9100 https://127.0.0.1:9101; \
    frame-src 'self' blob:; \
    object-src 'none'; \
    base-uri 'self'; \
    form-action 'self'; \
    frame-ancestors 'self'";

/// Policy for generated reports and exports served from `/files`. A report document runs its own
/// scripts (frontend/spec/reports/ui-surface.md OMS-REG-RPT-11.7 — a template may chart, paginate
/// or lay itself out in script), so unlike an uploaded file this one must be allowed to.
/// `sandbox allow-scripts` without `allow-same-origin` keeps the document on an opaque origin,
/// where its scripts run but reach no cookie, no storage, and no part of the app; this matches the
/// `sandbox="allow-scripts"` the front end frames it with (ReportDetailView.tsx). `connect-src
/// 'none'` means a report's script still can't send anything out, and everything else stays at
/// `default-src 'none'` bar the inline styles and data-URL images a report lays itself out with.
const FILES_POLICY: &str = "default-src 'none'; \
    img-src 'self' data:; \
    style-src 'unsafe-inline'; \
    script-src 'unsafe-inline'; \
    connect-src 'none'; \
    sandbox allow-scripts; \
    frame-ancestors 'self'";

/// Policy for uploaded attachments served from `/sync_files` (the #1640 path). `sandbox` without
/// `allow-scripts` stops an uploaded HTML file running script even when opened directly — a user
/// upload is never meant to run, unlike a generated report (`FILES_POLICY`). `frame-ancestors
/// 'self'` rather than `'none'`, as the front end shows these in an iframe.
const SYNC_FILES_POLICY: &str = "default-src 'none'; \
    img-src 'self' data:; \
    style-src 'unsafe-inline'; \
    sandbox; \
    frame-ancestors 'self'";

const HSTS: &str = "max-age=31536000";

static INLINE_SCRIPT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?is)<script\b([^>]*)>(.*?)</script\s*>").unwrap());
static SRC_ATTRIBUTE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)\bsrc\s*=").unwrap());

/// The app policy for an HTML page served from the front end's dist, allowing each inline script
/// already in that file by its hash: the build's import map (which plugin bundles resolve
/// `solid-js` and the plugin SDK through) and the pre-paint and browser-warning scripts. The
/// hashes change with every build, so they're worked out from the file rather than configured. A
/// script injected into the page later isn't in the file, so it's still blocked.
pub fn app_policy_for_document(html: &str) -> String {
    let hashes: Vec<String> = INLINE_SCRIPT
        .captures_iter(html)
        .filter(|script| !SRC_ATTRIBUTE.is_match(&script[1]))
        .map(|script| {
            let digest = Sha256::digest(script[2].as_bytes());
            format!("'sha256-{}'", BASE64_STANDARD.encode(digest))
        })
        .collect();

    if hashes.is_empty() {
        return APP_POLICY.to_string();
    }
    APP_POLICY.replacen(
        "script-src 'self'",
        &format!("script-src 'self' {}", hashes.join(" ")),
        1,
    )
}

fn content_security_policy(path: &str) -> Option<&'static str> {
    // Generated reports/exports run their own scripts; uploaded attachments never may.
    if path == "/files" {
        return Some(FILES_POLICY);
    }
    if path.starts_with("/sync_files/") {
        return Some(SYNC_FILES_POLICY);
    }
    // GET /graphql serves the GraphiQL playground, which loads its scripts from unpkg
    if path == "/graphql" {
        return None;
    }
    Some(APP_POLICY)
}

/// Sets security response headers (CSP, X-Frame-Options, nosniff, and HSTS when serving over
/// TLS). A header the handler already set is left alone.
pub struct SecurityHeaders {
    is_https: bool,
}

impl SecurityHeaders {
    pub fn new(is_https: bool) -> Self {
        Self { is_https }
    }
}

impl<S, B> Transform<S, ServiceRequest> for SecurityHeaders
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = SecurityHeadersMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(SecurityHeadersMiddleware {
            service,
            is_https: self.is_https,
        }))
    }
}

pub struct SecurityHeadersMiddleware<S> {
    service: S,
    is_https: bool,
}

impl<S, B> Service<ServiceRequest> for SecurityHeadersMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let policy = content_security_policy(req.path());
        let is_https = self.is_https;
        let fut = self.service.call(req);

        Box::pin(async move {
            let mut res = fut.await?;
            let headers = res.headers_mut();

            if let Some(policy) = policy {
                set_if_absent(headers, header::CONTENT_SECURITY_POLICY, policy);
            }
            set_if_absent(headers, header::X_FRAME_OPTIONS, "SAMEORIGIN");
            set_if_absent(headers, header::X_CONTENT_TYPE_OPTIONS, "nosniff");
            // Browsers ignore HSTS sent over plain HTTP, to IP-address hosts, or over a
            // connection with certificate errors, so self-signed LAN installs are unaffected
            if is_https {
                set_if_absent(headers, header::STRICT_TRANSPORT_SECURITY, HSTS);
            }

            Ok(res)
        })
    }
}

fn set_if_absent(headers: &mut HeaderMap, name: HeaderName, value: &'static str) {
    if !headers.contains_key(&name) {
        headers.insert(name, HeaderValue::from_static(value));
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use actix_web::{App, HttpResponse, test, web};

    async fn headers_for(is_https: bool, path: &str) -> HeaderMap {
        let app = test::init_service(
            App::new()
                .wrap(SecurityHeaders::new(is_https))
                .default_service(web::to(HttpResponse::Ok)),
        )
        .await;
        let res = test::call_service(&app, test::TestRequest::get().uri(path).to_request()).await;
        res.headers().clone()
    }

    fn csp(headers: &HeaderMap) -> Option<&str> {
        headers
            .get(header::CONTENT_SECURITY_POLICY)
            .map(|v| v.to_str().unwrap())
    }

    #[actix_web::test]
    async fn app_pages_get_the_app_policy() {
        for path in ["/", "/some/route", "/old-ui/some/route"] {
            let headers = headers_for(false, path).await;
            assert_eq!(csp(&headers), Some(APP_POLICY), "{path}");
            assert_eq!(headers.get(header::X_FRAME_OPTIONS).unwrap(), "SAMEORIGIN");
            assert_eq!(
                headers.get(header::X_CONTENT_TYPE_OPTIONS).unwrap(),
                "nosniff"
            );
        }
    }

    #[actix_web::test]
    async fn generated_files_may_run_scripts_but_uploads_may_not() {
        // A generated report (`/files`) runs its own scripts under `sandbox allow-scripts`…
        let files = headers_for(false, "/files?id=abc").await;
        assert_eq!(csp(&files), Some(FILES_POLICY));
        assert!(csp(&files).unwrap().contains("sandbox allow-scripts"));
        assert!(csp(&files).unwrap().contains("script-src 'unsafe-inline'"));
        assert!(csp(&files).unwrap().contains("connect-src 'none'"));

        // …while an uploaded attachment (`/sync_files`) keeps the strict `sandbox` that runs none.
        let sync_files = headers_for(false, "/sync_files/asset/record/file").await;
        assert_eq!(csp(&sync_files), Some(SYNC_FILES_POLICY));
        assert!(csp(&sync_files).unwrap().contains("sandbox;"));
        assert!(!csp(&sync_files).unwrap().contains("allow-scripts"));

        // The two routes get different policies.
        assert_ne!(csp(&files), csp(&sync_files));
    }

    #[actix_web::test]
    async fn graphql_playground_has_no_policy() {
        let headers = headers_for(false, "/graphql").await;
        assert_eq!(csp(&headers), None);
        assert_eq!(
            headers.get(header::X_CONTENT_TYPE_OPTIONS).unwrap(),
            "nosniff"
        );
    }

    #[actix_web::test]
    async fn hsts_only_over_https() {
        assert!(
            !headers_for(false, "/")
                .await
                .contains_key(header::STRICT_TRANSPORT_SECURITY)
        );
        assert_eq!(
            headers_for(true, "/")
                .await
                .get(header::STRICT_TRANSPORT_SECURITY)
                .unwrap(),
            HSTS
        );
    }

    #[actix_web::test]
    async fn handler_set_header_is_kept() {
        let app = test::init_service(
            App::new()
                .wrap(SecurityHeaders::new(false))
                .default_service(web::to(|| async {
                    HttpResponse::Ok()
                        .insert_header((header::X_FRAME_OPTIONS, "DENY"))
                        .finish()
                })),
        )
        .await;
        let res = test::call_service(&app, test::TestRequest::get().uri("/").to_request()).await;
        assert_eq!(res.headers().get(header::X_FRAME_OPTIONS).unwrap(), "DENY");
    }

    #[actix_web::test]
    async fn document_policy_allows_the_pages_own_inline_scripts_by_hash() {
        let html = r#"<html><head>
            <script>abc</script>
            <script type="importmap"></script>
            <script type="module" crossorigin src="/assets/index.js"></script>
        </head></html>"#;

        let policy = app_policy_for_document(html);

        // sha256("abc") and sha256(""); the external script gets no hash. The hashes land right
        // after 'self', before 'unsafe-eval' (source order in a CSP list doesn't matter).
        assert!(
            policy.contains(
                "script-src 'self' 'sha256-ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=' \
                 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'unsafe-eval';"
            ),
            "{policy}"
        );
        assert_eq!(policy.matches("'sha256-").count(), 2, "{policy}");
        assert_eq!(
            policy.replacen(
                " 'sha256-ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=' \
                 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
                "",
                1
            ),
            APP_POLICY
        );
    }

    #[actix_web::test]
    async fn document_policy_without_inline_scripts_is_the_app_policy() {
        let html = r#"<html><script src="/pre.js"></script></html>"#;
        assert_eq!(app_policy_for_document(html), APP_POLICY);
    }
}
