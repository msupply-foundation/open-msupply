//! End-to-end tests of the provider-facing half of the flow against a stub OpenID provider:
//! discovery, the token exchange, and — the part worth testing hardest — what
//! [`OidcService::verify_id_token`] refuses to accept.

use chrono::{Duration, Utc};
use httpmock::{Method::GET, Method::POST, MockServer};
use jsonwebtoken::{Algorithm, EncodingKey, Header};
use serde_json::{json, Value};

use crate::settings::{OidcAccountSource, OidcPermissionSource, OidcSettings};

use super::{OidcError, OidcService};

/// PKCS#1 DER of a 2048-bit RSA key, base64. Generated for these tests and used nowhere else —
/// it signs stub tokens for a stub provider, so it is a fixture, not a credential.
const TEST_KEY_PKCS1_DER_BASE64: &str = concat!(
    "MIIEpQIBAAKCAQEAmVa6T59lUOYpWKehk0vxmD+72kb5vGDjLlfn14IYU0CufEoLKg2JvvrRlQhgFqS4NzrrcDtt5B6Ieot",
    "PYb6LDxSVFIGrMStPnaTPN6eNIODFJaVttrKHJ+vzBzHY0cZsHhfJKUa5ZphNgPgNnbeEkY9WNx6zUrbhmdYsu8n/wRK18p",
    "J0lSyErv3WyiaNhHvJEd30vFotIDoHV1dg9a1obu1xJxeZOC52fy5z43AV9Au4vscSsbzu+aCe4wRRunlpiZrlIDHfxdu8P",
    "gV/aK798XZ18LnQlWdMbfr6D3ui8+nc5ws8Ns6jZncMR5vLfElumO2zA3hG2voCggApNc3/gwIDAQABAoIBAEnolCfRr+906",
    "MPrFIWfSsU0HxMAN9pVJttNEpn9AkWKfS+6LrRnzxeG5KL9ZPc1EPfKBfZUJs0X7HeIk0wNIBC2Pn8iWwX5lsfoytpL/8mzn",
    "ULegEnZtiyHXV3/6D6Acdd1ZofnJ3DsgxrhNQrqjFLusEMkIJIDRS01nt0q6YPBBdanwk5S1lqYbpIR3WbvCwAu5qWLAhS82",
    "zJ1/Bu5eJHSowJXPs43lLu7IbqG2M6kcy5le/LEPPqTHQcFUesg2BlK/x57Iehz9xbtUC6hqyVt0ufgNi7XqesnupWCm3Zyu",
    "YNUggN9oyWrzUerupqIxa0yoKVTZGdGRWGAuo6FIw0CgYEA14Xa6AsHBmiNpFcYvDeWyTWE3BMysHqWr/xIEwobi2evR1lJk",
    "mJ+F/l/SjzkYBV4MHj1Co3Cw467wGB/gbsGUKV2O4I37iG16G1hUUROBl9RLdUeCyzKh69YXeVstPWUpWgRK676Gli/LEujH",
    "Sf6PSR+kT2yGS+z4tz6tdn6tGUCgYEAtiMeJg6e8AKfuhkHYQa1WvVYpd56jdmr8szSPAhRn3lyHNhwg9i6m/tnMYv93iS3W",
    "KVAEnSGBJuk6O5HGXFWBHi0cbfsi2O+naa/VBctn+caNF1Gpu6rY/Yn7jamlYTySO6JBB52SD/xzeROmYHpq4M88JJ+kVRLR",
    "L5Ve7pz4ccCgYEAgBb3wU08gZyGAhQZiVNodHEwYzOtvqE9CZ7gnyA0uqeGztrMFQogctM/ybli6ZAY/IYG7JzQEjW0dGNlp",
    "I6o9ClCmZ+M6iRy3o6Tdh8oWDUyJBEzZ+TZAcc+t59w+iOykpPFELdPwXTZOdRCP0PRP6F+74dBYCKvwLcg8g95JtkCgYEAi",
    "ynF7VoaglPe6vgYtT/E7ZysgP++MAfy428v6wKIKwtF71hIj9TWsDukmyzVahgvpqGMlQ1HINozZG47EOuRx5TaelEHgXFSw",
    "W4Yng2fpJ+VXBEw3HdbqOL5m39SRMfxv1vSgL0trwJ8pM4eaBflDFEYDNBBuJTpdbrf4cuSox0CgYEAwOi+KS6ICNar3P2XL",
    "0VmLJiPlGr9BsEkXsA/dnz9csdfsOt/Cks1cy0CUsKwZJl/MjUbyCb90bmGQd6UIPK3JVdEJs4i0HxV7DyozJWr3vMnf/rgu",
    "T3E/NE1iLslZcTZc586ZEQxtLpAroiznSBu34clnnFMpY0AOvxJXaLYzxk=",
);

/// `n` of the key above, base64url, as it appears in the stub provider's JWK set.
const TEST_KEY_MODULUS: &str = concat!(
    "mVa6T59lUOYpWKehk0vxmD-72kb5vGDjLlfn14IYU0CufEoLKg2JvvrRlQhgFqS4NzrrcDtt5B6IeotPYb6LDxSVFIGrMSt",
    "PnaTPN6eNIODFJaVttrKHJ-vzBzHY0cZsHhfJKUa5ZphNgPgNnbeEkY9WNx6zUrbhmdYsu8n_wRK18pJ0lSyErv3WyiaNhHv",
    "JEd30vFotIDoHV1dg9a1obu1xJxeZOC52fy5z43AV9Au4vscSsbzu-aCe4wRRunlpiZrlIDHfxdu8PgV_aK798XZ18LnQlWd",
    "Mbfr6D3ui8-nc5ws8Ns6jZncMR5vLfElumO2zA3hG2voCggApNc3_gw",
);

const KEY_ID: &str = "test-key";
const CLIENT_ID: &str = "open-msupply";

fn encoding_key() -> EncodingKey {
    use base64::{engine::general_purpose::STANDARD, Engine};
    EncodingKey::from_rsa_der(&STANDARD.decode(TEST_KEY_PKCS1_DER_BASE64).unwrap())
}

fn sign(claims: &Value, kid: &str) -> String {
    let mut header = Header::new(Algorithm::RS256);
    header.kid = Some(kid.to_string());
    jsonwebtoken::encode(&header, claims, &encoding_key()).unwrap()
}

/// Claims a well-behaved Keycloak would issue.
fn id_token_claims(issuer: &str, nonce: &str) -> Value {
    json!({
        "iss": issuer,
        "aud": CLIENT_ID,
        "azp": CLIENT_ID,
        "sub": "9c1e8b0e-0000-0000-0000-000000000001",
        "exp": (Utc::now() + Duration::minutes(5)).timestamp(),
        "iat": Utc::now().timestamp(),
        "nonce": nonce,
        "preferred_username": "jane",
        "realm_access": { "roles": ["dispensary", "offline_access"] },
    })
}

/// A stub provider serving discovery and its key set. Add the token endpoint with
/// [`StubProvider::serves_token`].
struct StubProvider {
    server: MockServer,
}

impl StubProvider {
    fn start() -> Self {
        let server = MockServer::start();
        let issuer = server.base_url();

        server.mock(|when, then| {
            when.method(GET).path("/.well-known/openid-configuration");
            then.status(200).json_body(json!({
                "issuer": issuer,
                "authorization_endpoint": format!("{issuer}/protocol/openid-connect/auth"),
                "token_endpoint": format!("{issuer}/protocol/openid-connect/token"),
                "jwks_uri": format!("{issuer}/protocol/openid-connect/certs"),
            }));
        });

        server.mock(|when, then| {
            when.method(GET).path("/protocol/openid-connect/certs");
            then.status(200).json_body(json!({
                "keys": [{
                    "kty": "RSA",
                    "use": "sig",
                    "alg": "RS256",
                    "kid": KEY_ID,
                    "n": TEST_KEY_MODULUS,
                    "e": "AQAB",
                }]
            }));
        });

        StubProvider { server }
    }

    /// Register the token endpoint. Separate from [`Self::start`] because the ID token has to be
    /// signed with this server's own issuer, which isn't known until it is listening.
    fn serves_token(&self, id_token: String) {
        self.server.mock(|when, then| {
            when.method(POST).path("/protocol/openid-connect/token");
            then.status(200).json_body(json!({
                "access_token": "stub-access-token",
                "token_type": "Bearer",
                "expires_in": 300,
                "id_token": id_token,
            }));
        });
    }

    fn issuer(&self) -> String {
        self.server.base_url()
    }

    fn service(&self) -> OidcService {
        OidcService::new(OidcSettings {
            issuer: self.issuer(),
            client_id: CLIENT_ID.to_string(),
            client_secret: None,
            redirect_url: "http://localhost:8000/auth/oidc/callback".to_string(),
            scopes: vec!["openid".to_string(), "profile".to_string()],
            account_source: OidcAccountSource::default(),
            username_claim: "preferred_username".to_string(),
            group_claim: "groups".to_string(),
            permission_source: OidcPermissionSource::default(),
            roles_claim: "realm_access.roles".to_string(),
            role_template_prefix: Some("role_".to_string()),
            logout_from_provider: false,
            button_label: "Sign in with Keycloak".to_string(),
        })
        .unwrap()
    }
}

/// Pull a query parameter out of the authorization URL.
fn query_param(url: &str, name: &str) -> Option<String> {
    url::Url::parse(url)
        .unwrap()
        .query_pairs()
        .find(|(key, _)| key == name)
        .map(|(_, value)| value.to_string())
}

#[actix_rt::test]
async fn begin_login_builds_a_pkce_authorization_request() {
    let provider = StubProvider::start();
    let service = provider.service();

    let url = service
        .begin_login(Some("/dashboard".to_string()))
        .await
        .unwrap();

    assert!(url.starts_with(&format!(
        "{}/protocol/openid-connect/auth",
        provider.issuer()
    )));
    assert_eq!(query_param(&url, "response_type").as_deref(), Some("code"));
    assert_eq!(query_param(&url, "client_id").as_deref(), Some(CLIENT_ID));
    assert_eq!(
        query_param(&url, "scope").as_deref(),
        Some("openid profile")
    );
    assert_eq!(
        query_param(&url, "redirect_uri").as_deref(),
        Some("http://localhost:8000/auth/oidc/callback")
    );
    assert_eq!(
        query_param(&url, "code_challenge_method").as_deref(),
        Some("S256")
    );
    assert!(query_param(&url, "code_challenge").is_some());
    assert!(query_param(&url, "nonce").is_some());

    // The state must be redeemable exactly once, and must carry the return path.
    let state = query_param(&url, "state").unwrap();
    let pending = service.take_pending(&state).await.unwrap();
    assert_eq!(pending.redirect_after.as_deref(), Some("/dashboard"));
    assert!(matches!(
        service.take_pending(&state).await,
        Err(OidcError::InvalidState)
    ));
}

#[actix_rt::test]
async fn an_unknown_state_is_rejected() {
    let provider = StubProvider::start();
    assert!(matches!(
        provider.service().take_pending("forged").await,
        Err(OidcError::InvalidState)
    ));
}

#[actix_rt::test]
async fn code_is_exchanged_and_a_well_formed_token_verifies() {
    let nonce = "the-nonce";
    let provider = StubProvider::start();
    provider.serves_token(sign(&id_token_claims(&provider.issuer(), nonce), KEY_ID));

    let service = provider.service();
    let id_token = service
        .exchange_code("the-code", "the-verifier")
        .await
        .unwrap();
    let verified = service.verify_id_token(&id_token, nonce).await.unwrap();

    assert_eq!(
        verified.get("preferred_username").and_then(Value::as_str),
        Some("jane")
    );
    assert_eq!(
        super::claims::roles_from_claim(&verified, "realm_access.roles"),
        vec!["dispensary".to_string(), "offline_access".to_string()]
    );
}

#[actix_rt::test]
async fn a_token_for_a_different_sign_in_is_rejected() {
    let provider = StubProvider::start();
    let claims = id_token_claims(&provider.issuer(), "someone-elses-nonce");
    let service = provider.service();

    let error = service
        .verify_id_token(&sign(&claims, KEY_ID), "our-nonce")
        .await
        .unwrap_err();

    assert!(
        matches!(&error, OidcError::InvalidIdToken(detail) if detail.contains("nonce")),
        "unexpected error: {:?}",
        error
    );
}

#[actix_rt::test]
async fn a_token_missing_its_nonce_is_rejected() {
    let provider = StubProvider::start();
    let mut claims = id_token_claims(&provider.issuer(), "unused");
    claims.as_object_mut().unwrap().remove("nonce");

    let error = provider
        .service()
        .verify_id_token(&sign(&claims, KEY_ID), "our-nonce")
        .await
        .unwrap_err();

    assert!(
        matches!(&error, OidcError::InvalidIdToken(detail) if detail.contains("nonce")),
        "unexpected error: {:?}",
        error
    );
}

#[actix_rt::test]
async fn an_expired_token_is_rejected() {
    let provider = StubProvider::start();
    let mut claims = id_token_claims(&provider.issuer(), "the-nonce");
    // Beyond the default 60s leeway.
    claims["exp"] = json!((Utc::now() - Duration::minutes(10)).timestamp());

    assert!(matches!(
        provider
            .service()
            .verify_id_token(&sign(&claims, KEY_ID), "the-nonce")
            .await,
        Err(OidcError::InvalidIdToken(_))
    ));
}

#[actix_rt::test]
async fn a_token_for_another_client_is_rejected() {
    let provider = StubProvider::start();
    let mut claims = id_token_claims(&provider.issuer(), "the-nonce");
    claims["aud"] = json!("some-other-client");
    claims["azp"] = json!("some-other-client");

    assert!(matches!(
        provider
            .service()
            .verify_id_token(&sign(&claims, KEY_ID), "the-nonce")
            .await,
        Err(OidcError::InvalidIdToken(_))
    ));
}

/// A token whose `aud` includes us but which was minted for another client of the same realm.
#[actix_rt::test]
async fn a_token_relayed_from_another_client_is_rejected() {
    let provider = StubProvider::start();
    let mut claims = id_token_claims(&provider.issuer(), "the-nonce");
    claims["aud"] = json!([CLIENT_ID, "some-other-client"]);
    claims["azp"] = json!("some-other-client");

    let error = provider
        .service()
        .verify_id_token(&sign(&claims, KEY_ID), "the-nonce")
        .await
        .unwrap_err();

    assert!(
        matches!(&error, OidcError::InvalidIdToken(detail) if detail.contains("another client")),
        "unexpected error: {:?}",
        error
    );
}

#[actix_rt::test]
async fn a_token_from_another_issuer_is_rejected() {
    let provider = StubProvider::start();
    let mut claims = id_token_claims(&provider.issuer(), "the-nonce");
    claims["iss"] = json!("https://keycloak.evil.example.org/realms/msupply");

    assert!(matches!(
        provider
            .service()
            .verify_id_token(&sign(&claims, KEY_ID), "the-nonce")
            .await,
        Err(OidcError::InvalidIdToken(_))
    ));
}

#[actix_rt::test]
async fn a_token_signed_with_an_unpublished_key_is_rejected() {
    let provider = StubProvider::start();
    let claims = id_token_claims(&provider.issuer(), "the-nonce");

    let error = provider
        .service()
        .verify_id_token(&sign(&claims, "rotated-away"), "the-nonce")
        .await
        .unwrap_err();

    assert!(
        matches!(&error, OidcError::InvalidIdToken(detail) if detail.contains("rotated-away")),
        "unexpected error: {:?}",
        error
    );
}

#[actix_rt::test]
async fn a_tampered_token_is_rejected() {
    let provider = StubProvider::start();
    let claims = id_token_claims(&provider.issuer(), "the-nonce");
    let token = sign(&claims, KEY_ID);

    // Swap the payload for one claiming a different user, keeping the original signature.
    let mut forged_claims = claims.clone();
    forged_claims["preferred_username"] = json!("admin");
    let forged_payload = {
        use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
        URL_SAFE_NO_PAD.encode(serde_json::to_vec(&forged_claims).unwrap())
    };
    let parts: Vec<&str> = token.split('.').collect();
    let forged = format!("{}.{forged_payload}.{}", parts[0], parts[2]);

    assert!(matches!(
        provider
            .service()
            .verify_id_token(&forged, "the-nonce")
            .await,
        Err(OidcError::InvalidIdToken(_))
    ));
}

#[actix_rt::test]
async fn a_token_endpoint_error_is_surfaced() {
    let server = MockServer::start();
    let issuer = server.base_url();
    server.mock(|when, then| {
        when.method(GET).path("/.well-known/openid-configuration");
        then.status(200).json_body(json!({
            "issuer": issuer,
            "authorization_endpoint": format!("{issuer}/auth"),
            "token_endpoint": format!("{issuer}/token"),
            "jwks_uri": format!("{issuer}/certs"),
        }));
    });
    server.mock(|when, then| {
        when.method(POST).path("/token");
        then.status(400).json_body(json!({
            "error": "invalid_grant",
            "error_description": "Code not valid",
        }));
    });

    let service = OidcService::new(OidcSettings {
        issuer: issuer.clone(),
        client_id: CLIENT_ID.to_string(),
        client_secret: Some("shhh".to_string()),
        redirect_url: "http://localhost:8000/auth/oidc/callback".to_string(),
        scopes: vec!["openid".to_string()],
        account_source: OidcAccountSource::default(),
        username_claim: "preferred_username".to_string(),
        group_claim: "groups".to_string(),
        permission_source: OidcPermissionSource::default(),
        roles_claim: "realm_access.roles".to_string(),
        role_template_prefix: None,
        logout_from_provider: false,
        button_label: "Sign in".to_string(),
    })
    .unwrap();

    let error = service
        .exchange_code("stale-code", "verifier")
        .await
        .unwrap_err();
    assert!(
        matches!(&error, OidcError::ProviderRejected(detail)
            if detail.contains("invalid_grant") && detail.contains("Code not valid")),
        "unexpected error: {:?}",
        error
    );
}

#[actix_rt::test]
async fn a_provider_identifying_as_another_issuer_is_refused() {
    let server = MockServer::start();
    let issuer = server.base_url();
    server.mock(|when, then| {
        when.method(GET).path("/.well-known/openid-configuration");
        then.status(200).json_body(json!({
            // Realm mix-up: the document belongs to a different realm than we asked for.
            "issuer": "https://keycloak.example.org/realms/other",
            "authorization_endpoint": format!("{issuer}/auth"),
            "token_endpoint": format!("{issuer}/token"),
            "jwks_uri": format!("{issuer}/certs"),
        }));
    });

    let service = OidcService::new(OidcSettings {
        issuer,
        client_id: CLIENT_ID.to_string(),
        client_secret: None,
        redirect_url: "http://localhost:8000/auth/oidc/callback".to_string(),
        scopes: vec!["openid".to_string()],
        account_source: OidcAccountSource::default(),
        username_claim: "preferred_username".to_string(),
        group_claim: "groups".to_string(),
        permission_source: OidcPermissionSource::default(),
        roles_claim: "realm_access.roles".to_string(),
        role_template_prefix: None,
        logout_from_provider: false,
        button_label: "Sign in".to_string(),
    })
    .unwrap();

    assert!(matches!(
        service.begin_login(None).await,
        Err(OidcError::Configuration(_))
    ));
}
