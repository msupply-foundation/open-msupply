//! HTTP endpoints for OpenID Connect single sign-on.
//!
//! Three routes, all unauthenticated by design — they are how a user *becomes* authenticated:
//!
//! * `GET /auth/oidc/config` — what the login page needs to decide whether to offer SSO.
//! * `GET /auth/oidc/login` — starts the flow, redirecting to the provider.
//! * `GET /auth/oidc/callback` — the provider's redirect target; ends with a session cookie.
//!
//! The session cookie is the same one the GraphQL `authToken` mutation sets, so everything
//! downstream (GraphQL, `/files`, printing, the cold-chain API) accepts an SSO session without
//! knowing it exists. Keep the attributes here in step with
//! `graphql_general::queries::login::set_session_cookie`.

use actix_web::{
    cookie::{time::Duration as CookieDuration, Cookie, SameSite},
    http::header,
    web::{self, Data},
    HttpRequest, HttpResponse,
};
use serde::Deserialize;
use service::{
    auth_data::AuthData,
    oidc::{OidcError, OidcService},
    service_provider::ServiceProvider,
    settings::Settings,
};

const URL_PATH: &str = "/auth/oidc";

/// Mirrors `graphql_general::queries::login::COOKIE_MAX_AGE_SECONDS`: much longer than the session
/// lifetime, because the server is the sole authority on whether a session is still valid and
/// never re-issues the cookie on ordinary responses.
const COOKIE_MAX_AGE_SECONDS: i64 = 60 * 60 * 24 * 30;

/// Present in the app whether or not OIDC is configured, so `/auth/oidc/config` can answer
/// honestly (and the other routes can 404-equivalent) without conditional route registration.
pub struct OidcState(pub Option<OidcService>);

impl OidcState {
    fn service(&self) -> Result<&OidcService, HttpResponse> {
        self.0.as_ref().ok_or_else(|| {
            HttpResponse::NotFound().body("Single sign-on is not configured on this server")
        })
    }
}

pub fn config_oidc(cfg: &mut web::ServiceConfig) {
    cfg.route(&format!("{URL_PATH}/config"), web::get().to(get_config));
    cfg.route(&format!("{URL_PATH}/login"), web::get().to(get_login));
    cfg.route(&format!("{URL_PATH}/callback"), web::get().to(get_callback));
    cfg.route(&format!("{URL_PATH}/logout"), web::get().to(get_logout));
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ConfigResponse {
    enabled: bool,
    /// Where the login button should send the browser. Absolute path on this server.
    login_url: String,
    /// Where the logout action should send the browser, when the deployment has asked for the
    /// provider's session to end too. `None` leaves logout entirely as it was.
    logout_url: Option<String>,
    button_label: Option<String>,
}

/// Plain REST rather than GraphQL: the login page needs this before it has a session, and a REST
/// probe keeps it out of the generated GraphQL types (so a front end can adopt it without a
/// codegen round trip).
async fn get_config(oidc: Data<OidcState>) -> HttpResponse {
    let response = match &oidc.0 {
        Some(service) => ConfigResponse {
            enabled: true,
            login_url: format!("{URL_PATH}/login"),
            logout_url: service
                .settings()
                .logout_from_provider
                .then(|| format!("{URL_PATH}/logout")),
            button_label: Some(service.settings().button_label.clone()),
        },
        None => ConfigResponse {
            enabled: false,
            login_url: format!("{URL_PATH}/login"),
            logout_url: None,
            button_label: None,
        },
    };
    HttpResponse::Ok().json(response)
}

#[derive(Deserialize)]
struct LoginQuery {
    /// Where to return to after signing in: a path on this server, or an absolute URL on one of
    /// the configured `cors_origins` (which is how the front end returns to its own dev-server
    /// origin, where it is served separately from the API).
    redirect: Option<String>,
}

async fn get_login(
    query: web::Query<LoginQuery>,
    oidc: Data<OidcState>,
    settings: Data<Settings>,
) -> HttpResponse {
    let service = match oidc.service() {
        Ok(service) => service,
        Err(response) => return response,
    };

    let redirect_after = query
        .redirect
        .as_deref()
        .and_then(|raw| sanitise_redirect(raw, &settings.server.cors_origins));

    match service.begin_login(redirect_after.clone()).await {
        Ok(url) => HttpResponse::Found()
            .append_header((header::LOCATION, url))
            .finish(),
        Err(error) => {
            log::error!("OIDC login could not be started: {error:#?}");
            error_redirect(&error, redirect_after.as_deref())
        }
    }
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: Option<String>,
    state: Option<String>,
    /// Set instead of `code` when the provider itself refused (e.g. the user cancelled, or the
    /// client is misconfigured).
    error: Option<String>,
    error_description: Option<String>,
}

async fn get_callback(
    query: web::Query<CallbackQuery>,
    oidc: Data<OidcState>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> HttpResponse {
    let service = match oidc.service() {
        Ok(service) => service,
        Err(response) => return response,
    };

    if let Some(provider_error) = &query.error {
        let description = query.error_description.as_deref().unwrap_or("no detail");
        log::warn!("OIDC provider returned an error: {provider_error} ({description})");
        return error_redirect(&OidcError::ProviderRejected(provider_error.clone()), None);
    }

    let (Some(code), Some(state)) = (&query.code, &query.state) else {
        log::warn!("OIDC callback hit without a code/state pair");
        return error_redirect(&OidcError::InvalidState, None);
    };

    // Redeemed here rather than inside `complete_login` so that the return target survives a
    // failure and the user lands back on the login page they started from.
    let pending = match service.take_pending(state).await {
        Ok(pending) => pending,
        Err(error) => {
            let in_flight = service.pending_count().await;
            log::warn!(
                "OIDC callback with an unknown or expired state ({in_flight} sign-in(s) in \
                 flight). With none in flight the server most likely restarted since the sign-in \
                 began; otherwise the attempt has timed out ({} minutes), the callback was \
                 replayed (a reload or Back — each state is single use), or it was never issued \
                 by this server.",
                service::oidc::pending::PENDING_AUTH_LIFETIME.num_minutes()
            );
            return error_redirect(&error, None);
        }
    };
    let redirect_after = pending.redirect_after.clone();

    let success = match service
        .complete_login(&service_provider, code, pending)
        .await
    {
        Ok(success) => success,
        Err(error) => {
            // Full detail to the log, a slug to the browser.
            log::error!("OIDC sign-in failed: {error:#?}");
            return error_redirect(&error, redirect_after.as_deref());
        }
    };

    let token = match auth_data.session_store.write() {
        // Marked as provider-authenticated: logout reads it to decide whether ending the
        // provider's session too is meaningful (see `get_logout`).
        Ok(mut store) => store.create_from_provider(&success.user_id),
        Err(err) => {
            log::error!("Session store lock poisoned: {err}");
            return error_redirect(
                &OidcError::InternalError("session store unavailable".to_string()),
                redirect_after.as_deref(),
            );
        }
    };

    log::info!("OIDC session created for '{}'", success.username);

    // Back to wherever the front end asked to return to, with `sso=success` on it. A front end that
    // has to load the user into its own client-side state points `redirect` at its login route and
    // acts on the marker there; one that bootstraps from the session cookie at startup points it at
    // its root and can ignore the marker entirely. Either way the choice is the front end's, not
    // ours to guess.
    let target = with_query_param(
        success.redirect_after.as_deref().unwrap_or("/"),
        "sso",
        "success",
    );
    HttpResponse::Ok()
        .cookie(session_cookie(&token, &auth_data))
        .content_type("text/html; charset=utf-8")
        .body(landing_page(&target))
}

#[derive(Deserialize)]
struct LogoutQuery {
    /// Where to land once logged out. Same validation as the sign-in's `redirect`.
    redirect: Option<String>,
}

/// End the session, and the provider's too when the deployment has asked for it.
///
/// A **navigation**, not an API call, because ending the provider's session means sending the
/// browser to the provider — something the GraphQL `logout` mutation cannot do. It is safe to route
/// every logout through here: a password session simply gets revoked and lands back in the app,
/// exactly as the mutation would leave it.
///
/// The session is revoked and the cookie cleared **before** the redirect, so the mSupply session
/// ends even if the user abandons the provider's confirmation page — logging out must not depend on
/// finishing a journey through someone else's UI.
async fn get_logout(
    request: HttpRequest,
    query: web::Query<LogoutQuery>,
    oidc: Data<OidcState>,
    auth_data: Data<AuthData>,
    settings: Data<Settings>,
) -> HttpResponse {
    let service = match oidc.service() {
        Ok(service) => service,
        Err(response) => return response,
    };

    let target = query
        .redirect
        .as_deref()
        .and_then(|raw| sanitise_redirect(raw, &settings.server.cors_origins))
        .unwrap_or_else(|| "/".to_string());

    let cookie_name = format!("session_{}", auth_data.cookie_suffix);
    let session_token = request.cookie(&cookie_name).map(|c| c.value().to_string());

    // Was this session the provider's to end? Read before revoking, which forgets it.
    let from_provider = match (&session_token, auth_data.session_store.read()) {
        (Some(token), Ok(store)) => store.is_from_provider(token),
        (_, Err(err)) => {
            log::error!("Session store lock poisoned: {err}");
            false
        }
        (None, _) => false,
    };

    if let Some(token) = &session_token {
        match auth_data.session_store.write() {
            Ok(mut store) => store.revoke(token),
            Err(err) => log::error!("Session store lock poisoned: {err}"),
        }
    }

    // Only a provider-authenticated session has a provider session to end. A password user may
    // have no account there at all, and sending them to its logout screen would be nonsense.
    let provider_logout = match from_provider {
        true => service
            .provider_logout_url(&absolute_url(&request, &target))
            .await
            .unwrap_or_else(|error| {
                // The provider being unreachable must not strand a user who has asked to log out:
                // the mSupply session is already gone, so fall back to landing them in the app.
                log::error!("Could not build the provider logout URL: {error:#?}");
                None
            }),
        false => None,
    };

    let destination = provider_logout.unwrap_or(target);
    log::info!("Logout complete, redirecting to {destination}");
    HttpResponse::Found()
        .cookie(cleared_session_cookie(&auth_data))
        .append_header((header::LOCATION, destination))
        .finish()
}

/// Absolutise a return target for the provider, which will not accept a bare path.
///
/// `sanitise_redirect` allows a path on this server or an allow-listed absolute URL; the first needs
/// this server's own scheme and host attaching, taken from the request.
fn absolute_url(request: &HttpRequest, target: &str) -> String {
    if !target.starts_with('/') {
        return target.to_string();
    }
    let info = request.connection_info().clone();
    format!("{}://{}{}", info.scheme(), info.host(), target)
}

/// Clears the session cookie. Mirrors `graphql_general::queries::login::clear_session_cookie` —
/// same name, path and attributes, or the browser keeps the one it has.
fn cleared_session_cookie(auth_data: &AuthData) -> Cookie<'static> {
    Cookie::build(format!("session_{}", auth_data.cookie_suffix), "")
        .path("/")
        .secure(!auth_data.no_ssl)
        .http_only(true)
        .same_site(SameSite::Strict)
        .max_age(CookieDuration::ZERO)
        .finish()
}

/// Sets the session cookie. Attributes must match the GraphQL login's, or the two logins would
/// produce cookies that shadow each other in the browser.
fn session_cookie(token: &str, auth_data: &AuthData) -> Cookie<'static> {
    Cookie::build(
        format!("session_{}", auth_data.cookie_suffix),
        token.to_string(),
    )
    .path("/")
    .secure(!auth_data.no_ssl)
    .http_only(true)
    .same_site(SameSite::Strict)
    .max_age(CookieDuration::seconds(COOKIE_MAX_AGE_SECONDS))
    .finish()
}

/// Final hop of the flow, as a page rather than a redirect.
///
/// The session cookie is `SameSite=Strict`, and a browser won't attach a Strict cookie to a
/// navigation that a *cross-site* page started — which is what the provider's redirect chain is.
/// A 302 from here would therefore land the user on an unauthenticated first page load. Navigating
/// from a page on our own origin makes the request same-site, so the cookie is sent and the app
/// loads signed in.
fn landing_page(target: &str) -> String {
    // The target appears in two contexts that escape differently: HTML entities mean nothing inside
    // a `<script>` element, so the script gets a JSON string literal (with `<` escaped so the
    // content can't close the element) while the link gets HTML escaping.
    let script_target = serde_json::to_string(target)
        .unwrap_or_else(|_| "\"/\"".to_string())
        .replace('<', "\\u003C");
    let href_target = html_escape(target);
    format!(
        r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Signing in…</title>
<script>window.location.replace({script_target});</script>
</head>
<body>
<p>Signed in. <a href="{href_target}">Continue</a>.</p>
</body>
</html>"#
    )
}

/// Send the browser back where it came from, carrying a slug describing what went wrong. Never
/// includes provider or account detail — that goes to the server log.
///
/// Same target as a success, so the front end shows the failure on the screen it returns to. With no
/// return target (a callback whose `state` we never issued, so there is nothing to read it from) the
/// app root is the best available guess.
fn error_redirect(error: &OidcError, redirect_after: Option<&str>) -> HttpResponse {
    let target = with_query_param(redirect_after.unwrap_or("/"), "oidcError", error.code());
    HttpResponse::Found()
        .append_header((header::LOCATION, target))
        .finish()
}

/// The query parameters this server owns on a return target. Stripped before a new one is added,
/// so they can never accumulate.
const OUR_MARKERS: [&str; 2] = ["sso", "oidcError"];

/// Put `key=value` on a return target, replacing any marker of ours it already carries.
///
/// Replacing rather than appending is load-bearing. A front end that returns the user to the URL
/// they were looking at hands back a URL that still carries the marker from the *previous*
/// attempt — so a plain append grows it without bound
/// (`?oidcError=expired&oidcError=failed&…`) and a reader taking the first value shows the
/// **stale** one. Anything else in the query is the front end's and is left alone, as is a
/// fragment.
fn with_query_param(target: &str, key: &str, value: &str) -> String {
    // A fragment comes after the query, so split it off before touching anything.
    let (without_fragment, fragment) = match target.split_once('#') {
        Some((head, fragment)) => (head, Some(fragment)),
        None => (target, None),
    };
    let (path, query) = match without_fragment.split_once('?') {
        Some((path, query)) => (path, query),
        None => (without_fragment, ""),
    };

    let mut params: Vec<String> = query
        .split('&')
        .filter(|param| !param.is_empty())
        .filter(|param| {
            let name = param.split('=').next().unwrap_or_default();
            !OUR_MARKERS.contains(&name)
        })
        .map(str::to_string)
        .collect();
    params.push(format!("{key}={value}"));

    let mut out = format!("{path}?{}", params.join("&"));
    if let Some(fragment) = fragment {
        out.push('#');
        out.push_str(fragment);
    }
    out
}

/// Validate the `redirect` parameter, so it can't be used to bounce a user to an attacker's site off
/// the back of a successful sign-in.
///
/// Accepts a path on this server, or an absolute URL whose origin is one of the configured
/// `cors_origins` — the same allowlist that decides which front ends may call this server at all.
/// Everything else is dropped (the flow then returns to `/`): protocol-relative URLs (`//evil/`),
/// the backslash variants browsers have historically normalised into those, and anything carrying
/// control characters or whitespace.
fn sanitise_redirect(raw: &str, allowed_origins: &[String]) -> Option<String> {
    let target = raw.trim();
    if target.is_empty()
        || target
            .chars()
            .any(|c| c.is_control() || c == '\\' || c.is_whitespace())
    {
        return None;
    }

    if target.starts_with('/') {
        // A path — but not a protocol-relative URL in disguise.
        return (!target.starts_with("//")).then(|| target.to_string());
    }

    let url = url::Url::parse(target).ok()?;
    let origin = url.origin();
    if !origin.is_tuple() {
        return None;
    }
    allowed_origins
        .iter()
        .any(|allowed| {
            url::Url::parse(allowed)
                .map(|allowed| allowed.origin() == origin)
                .unwrap_or(false)
        })
        .then(|| target.to_string())
}

fn html_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn allowed_origins() -> Vec<String> {
        vec![
            "http://localhost:3003".to_string(),
            "https://oms.example.org".to_string(),
            // A malformed entry must not be treated as a wildcard.
            "not a url".to_string(),
        ]
    }

    #[test]
    fn in_app_paths_are_accepted_as_redirect_targets() {
        for path in ["/", "/dashboard", "/old-ui/dashboard?tab=1"] {
            assert_eq!(
                sanitise_redirect(path, &allowed_origins()),
                Some(path.to_string())
            );
        }
    }

    #[test]
    fn only_allowlisted_origins_are_accepted_as_redirect_targets() {
        assert_eq!(
            sanitise_redirect("http://localhost:3003/dashboard", &allowed_origins()),
            Some("http://localhost:3003/dashboard".to_string())
        );

        for hostile in [
            // Not in cors_origins at all.
            "https://evil.example.org/",
            // Right host, wrong scheme/port — origins compare exactly.
            "https://localhost:3003/",
            "http://localhost:3004/",
            // Nor is the allowlist consulted for these shapes.
            "//evil.example.org/",
            "/\\evil.example.org/",
            "/path\\to",
            "dashboard",
            "",
            "/path with space",
            "/path\nSet-Cookie: x=y",
            "javascript:alert(1)",
            "not a url",
        ] {
            assert_eq!(
                sanitise_redirect(hostile, &allowed_origins()),
                None,
                "should have rejected {hostile:?}"
            );
        }
    }

    #[test]
    fn no_origins_allowlisted_means_paths_only() {
        assert_eq!(
            sanitise_redirect("/dashboard", &[]),
            Some("/dashboard".to_string())
        );
        assert_eq!(sanitise_redirect("http://localhost:3003/", &[]), None);
    }

    #[test]
    fn markers_are_put_on_whatever_the_front_end_asked_for() {
        // No query string yet.
        assert_eq!(
            with_query_param("/old-ui/login", "sso", "success"),
            "/old-ui/login?sso=success"
        );
        assert_eq!(
            with_query_param("http://localhost:3006/", "oidcError", "expired"),
            "http://localhost:3006/?oidcError=expired"
        );
        // Already carries a query of its own — kept, and not restarted with another '?'.
        assert_eq!(
            with_query_param("/dashboard?tab=1", "sso", "success"),
            "/dashboard?tab=1&sso=success"
        );
    }

    #[test]
    fn a_marker_from_a_previous_attempt_is_replaced_not_stacked() {
        // The front end returns the user to the URL they were looking at, which after a failure
        // still carries that failure. Appending grew it without bound and left a reader taking the
        // first value showing the stale one.
        assert_eq!(
            with_query_param("/?oidcError=expired", "oidcError", "no-site-access"),
            "/?oidcError=no-site-access"
        );
        // Across markers too — a retry after a success, or the other way round.
        assert_eq!(
            with_query_param("/?sso=success", "oidcError", "failed"),
            "/?oidcError=failed"
        );
        assert_eq!(
            with_query_param("/?oidcError=failed", "sso", "success"),
            "/?sso=success"
        );
    }

    #[test]
    fn repeated_failures_never_accumulate() {
        let mut target = "/".to_string();
        for slug in ["expired", "failed", "no-site-access", "no-site-access"] {
            target = with_query_param(&target, "oidcError", slug);
        }
        assert_eq!(target, "/?oidcError=no-site-access");
    }

    #[test]
    fn the_front_ends_own_query_and_fragment_survive() {
        assert_eq!(
            with_query_param(
                "/store-1/stock?tab=2&oidcError=expired#lines",
                "sso",
                "success"
            ),
            "/store-1/stock?tab=2&sso=success#lines"
        );
    }

    #[test]
    fn a_path_return_target_is_absolutised_for_the_provider() {
        // The provider will not accept a bare path as post_logout_redirect_uri, and an
        // allow-listed absolute target must be passed through untouched.
        let request = actix_web::test::TestRequest::default()
            .uri("/auth/oidc/logout")
            .insert_header(("host", "oms.example.org"))
            .to_http_request();

        assert_eq!(
            absolute_url(&request, "/dashboard"),
            "http://oms.example.org/dashboard"
        );
        assert_eq!(
            absolute_url(&request, "http://localhost:3006/"),
            "http://localhost:3006/"
        );
    }

    #[test]
    fn landing_page_escapes_its_target_for_both_contexts() {
        let page = landing_page("/dashboard\"></script><script>alert(1)</script>");

        // Neither context may end up with an executable injection.
        assert!(!page.contains("<script>alert"));
        assert!(!page.contains("</script><script>"));
        // The link is HTML-escaped...
        assert!(page.contains("&quot;&gt;&lt;/script&gt;"));
        // ...and the script sees a JSON string literal with `<` escaped, so it can't close the tag.
        assert!(page.contains(r#"window.location.replace("/dashboard\">"#));
    }

    #[test]
    fn landing_page_navigates_to_the_return_target() {
        let page = landing_page("/old-ui/login?sso=success");
        assert!(page.contains(r#"window.location.replace("/old-ui/login?sso=success")"#));
        assert!(page.contains(r#"href="/old-ui/login?sso=success""#));
    }
}
