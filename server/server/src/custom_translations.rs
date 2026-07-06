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
///
/// The v1 base is intentional and load-bearing: as well as any not-yet-migrated
/// legacy overrides, it carries report descriptions, which `standard_reports`
/// writes into v1 as `messages.how-to-read-<code>` and the frontend Reports
/// toolbar reads via i18next. These are global, runtime, single strings that
/// don't fit the per-language v2 structure, so don't drop the v1 base without a
/// new home for them. v2 always overlays/wins, and an admin can clear the
/// legacy (v1) namespace once migrated to remove any v1 bleed.
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

#[cfg(test)]
mod tests {
    use super::*;

    fn v1() -> BTreeMap<String, String> {
        BTreeMap::from([
            ("button.close".to_string(), "Legacy Close".to_string()),
            ("legacy.only".to_string(), "Legacy Only".to_string()),
        ])
    }

    fn v2() -> CustomTranslationsV2Value {
        serde_json::from_value(serde_json::json!({
            "fr": {
                "common": { "button.close": "Fermer", "shared": "Common" },
                "report": { "report.title": "Rapport", "shared": "Report" }
            },
            "fr-DJ": {
                "common": { "button.close": "Fermer (DJ)" }
            }
        }))
        .unwrap()
    }

    #[test]
    fn merge_overlays_v2_on_v1_keeping_v1_only_keys() {
        let merged = merge_for_language(&v1(), &v2(), "fr");

        // v2 wins over v1
        assert_eq!(merged.get("button.close"), Some(&"Fermer".to_string()));
        // v1-only keys are preserved
        assert_eq!(merged.get("legacy.only"), Some(&"Legacy Only".to_string()));
        // other namespaces are flattened in too
        assert_eq!(merged.get("report.title"), Some(&"Rapport".to_string()));
        // common wins over other namespaces on collision
        assert_eq!(merged.get("shared"), Some(&"Common".to_string()));
    }

    #[test]
    fn merge_applies_base_then_dialect() {
        // fr-DJ has no "shared"/"report" of its own, but inherits the fr base,
        // and its own button.close overrides the base.
        let merged = merge_for_language(&v1(), &v2(), "fr-DJ");
        assert_eq!(merged.get("button.close"), Some(&"Fermer (DJ)".to_string()));
        assert_eq!(merged.get("report.title"), Some(&"Rapport".to_string()));
    }

    #[test]
    fn merge_returns_v1_when_language_absent_from_v2() {
        let merged = merge_for_language(&v1(), &v2(), "es");
        assert_eq!(merged, v1());
    }
}
