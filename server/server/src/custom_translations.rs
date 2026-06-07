use std::collections::BTreeMap;

use actix_web::{
    error::InternalError,
    http::StatusCode,
    web::{self, Data, Query},
    Error, HttpResponse,
};
use serde::Deserialize;

use service::{
    preference::{
        flatten_language_namespaces, CustomTranslations, CustomTranslationsV2,
        CustomTranslationsV2Value, Preference,
    },
    service_provider::ServiceProvider,
};

pub fn config_custom_translations(cfg: &mut web::ServiceConfig) {
    cfg.route("/custom-translations", web::get().to(custom_translations));
}

#[derive(Deserialize)]
struct CustomTranslationsQuery {
    /// The language to load custom translations for. When omitted, the legacy
    /// v1 flat translations are returned (for older clients).
    lng: Option<String>,
}

async fn custom_translations(
    service_provider: Data<ServiceProvider>,
    query: Query<CustomTranslationsQuery>,
) -> Result<HttpResponse, Error> {
    let connection = service_provider.connection().map_err(|err| {
        log::error!("Couldn't get database connection: {err}");
        InternalError::new(
            "Could not connect to database",
            StatusCode::INTERNAL_SERVER_ERROR,
        )
    })?;

    // Legacy v1 flat map - applies to all languages.
    let v1 = CustomTranslations.load(&connection, None).map_err(|err| {
        log::error!("Failed to load custom translations: {err}");
        InternalError::new(
            "Could not load preference",
            StatusCode::INTERNAL_SERVER_ERROR,
        )
    })?;

    // Without a language we behave exactly as before (legacy clients).
    let Some(language) = &query.lng else {
        return Ok(HttpResponse::Ok().json(v1));
    };

    let v2 = CustomTranslationsV2.load(&connection, None).map_err(|err| {
        log::error!("Failed to load v2 custom translations: {err}");
        InternalError::new(
            "Could not load preference",
            StatusCode::INTERNAL_SERVER_ERROR,
        )
    })?;

    // The frontend has a single custom-translations override namespace, so we
    // return a flat key -> value map for the requested language. v1 is the base
    // (legacy), overlaid with v2 (base language then dialect) so v2 wins.
    let merged = merge_for_language(&v1, &v2, language);

    Ok(HttpResponse::Ok().json(merged))
}

/// Build a flat `key -> value` map for a language by starting from the legacy
/// v1 map and overlaying the v2 translations for the base language then the
/// full dialect (so the most specific language wins), with the `common`
/// namespace winning over others within each tier.
fn merge_for_language(
    v1: &BTreeMap<String, String>,
    v2: &CustomTranslationsV2Value,
    language: &str,
) -> BTreeMap<String, String> {
    let base_language = language.split('-').next().unwrap_or(language);

    let mut merged = v1.clone();

    // base language first, then dialect overlay (dialect wins)
    for lang in [base_language, language] {
        if let Some(namespaces) = v2.get(lang) {
            merged.extend(flatten_language_namespaces(namespaces));
        }
    }

    merged
}
