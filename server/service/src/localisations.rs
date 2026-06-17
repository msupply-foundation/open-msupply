use repository::StorageConnection;
use std::collections::{BTreeMap, HashMap};
use tera::{Error as TeraError, Function};
use thiserror::Error;

use rust_embed::RustEmbed;

use crate::preference::{
    CustomTranslations, CustomTranslationsV2, CustomTranslationsV2Value, Preference, PreferenceError,
};

#[derive(RustEmbed)]
#[include = "*.json"]
// Relative to server/Cargo.toml
#[folder = "../../client/packages/common/src/intl/locales"]
pub struct EmbeddedLocalisations;

#[derive(Debug, Error)]
#[error("No translation found and fallback is missing for key {0}")]
pub struct TranslationError(String);

pub struct LocalisationsService {
    /// Private field, can only be accessed via get_localisations so custom translations are initialised
    localisations: Localisations,
}

impl Default for LocalisationsService {
    fn default() -> Self {
        Self::new()
    }
}

impl LocalisationsService {
    pub fn new() -> Self {
        let mut localisations = Localisations {
            translations: HashMap::new(),
            custom_translations: BTreeMap::new(),
            custom_translations_v2: BTreeMap::new(),
        };

        // Initialise localisations with OMS default translations
        localisations.load_translations();

        Self { localisations }
    }

    /// Each time localisations is consumed, we should reload custom translations from the preference
    /// as they may have changed
    pub fn get_localisations(
        &self,
        connection: &StorageConnection,
    ) -> Result<Localisations, PreferenceError> {
        let mut localisations = self.localisations.clone();

        localisations.load_custom_translations(connection)?;

        Ok(localisations)
    }
}

// struct to manage translations
#[derive(Clone)]
pub struct Localisations {
    pub translations: HashMap<String, HashMap<String, HashMap<String, String>>>,
    /// Legacy v1 custom translations: flat `key -> value`, applied to all languages.
    pub custom_translations: BTreeMap<String, String>,
    /// v2 custom translations: `language -> namespace -> key -> value`.
    pub custom_translations_v2: CustomTranslationsV2Value,
}

impl Localisations {
    // Load translations from embedded files
    pub fn load_translations(&mut self) {
        // add read all namespace file names within locales
        for file in EmbeddedLocalisations::iter() {
            let file_namespace = file.split('/').nth(1).unwrap_or_default().to_string();
            let language = file.split('/').nth(0).unwrap_or_default().to_string();
            if let Some(content) = EmbeddedLocalisations::get(&file) {
                let json_data = content.data;
                let translations: HashMap<String, String> = serde_json::from_slice(&json_data)
                    .unwrap_or_else(|e| {
                        log::error!(
                            "Failed to parse JSON localisations file {file:?}. Backend/report translations will be unavailable due to: {e:?}"
                        );
                        HashMap::new()
                    });
                self.translations
                    .entry(language)
                    .or_default()
                    .insert(file_namespace, translations);
            }
        }
    }

    pub fn load_custom_translations(
        &mut self,
        connection: &StorageConnection,
    ) -> Result<(), PreferenceError> {
        let translations = CustomTranslations.load(connection, None)?;
        self.custom_translations = translations;

        self.custom_translations_v2 = CustomTranslationsV2.load(connection, None)?;

        Ok(())
    }

    // Get a translation for a given key and language
    // next need to add fallback and namespace to get Translation function
    pub fn get_translation(
        &self,
        GetTranslation {
            namespace,
            fallback,
            key,
        }: GetTranslation,
        language: &str,
    ) -> Result<String, TranslationError> {
        let default_namespace = "common".to_string();
        let default_language = "en".to_string();

        let language_with_dialect = language.to_string();
        // e.g. if language is "en-GB" then base_language is "en"
        let base_language = language.split('-').next().unwrap_or(language).to_string();

        let namespace = namespace.unwrap_or(default_namespace.clone());

        // Resolution order (matches the /custom-translations REST endpoint that
        // feeds the frontend):
        //   1. v2 custom override for the VIEWING language (dialect then base)
        //   2. legacy v1 flat override (global; includes report descriptions)
        //   3. embedded default translation (dialect -> base -> en)
        //
        // v2 deliberately doesn't fall back to other languages (e.g. a custom
        // override for English shouldn't apply to a French user) - that's what
        // the v1 fallback and embedded translations are for.
        for (cascade_language, cascade_namespace) in [
            (&language_with_dialect, &namespace),
            (&language_with_dialect, &default_namespace),
            (&base_language, &namespace),
            (&base_language, &default_namespace),
        ] {
            if let Some(value) = self.find_key_v2(cascade_language, cascade_namespace, &key) {
                return Ok(value);
            }
        }

        // Legacy v1 flat custom translations override all languages.
        if let Some(value) = self.custom_translations.get(&key) {
            return Ok(value.clone());
        }

        // Embedded default OMS translations.
        for (cascade_language, cascade_namespace) in [
            (&language_with_dialect, &namespace),
            (&language_with_dialect, &default_namespace),
            (&base_language, &namespace),
            (&base_language, &default_namespace),
            (&default_language, &namespace),
            (&default_language, &default_namespace),
        ] {
            if let Some(value) = self.find_key(cascade_language, cascade_namespace, &key) {
                return Ok(value);
            }
        }

        fallback.ok_or(TranslationError(key))
    }

    pub fn get_translation_function(&self, current_language: Option<String>) -> impl Function {
        let translation_copy = self.clone();
        let lang = match current_language {
            Some(language) => language,
            None => "en".to_string(),
        };
        Box::new(
            move |args: &HashMap<String, serde_json::Value>| -> Result<serde_json::Value, TeraError> {
                let key = args
                    .get("k")
                    .and_then(serde_json::Value::as_str)
                    .map(|s| s.to_string())
                    .ok_or(TeraError::msg("Translation key must be specified with 'k'"))?;

                let namespace = args
                    .get("n")
                    .and_then(serde_json::Value::as_str)
                    .map(|s| s.to_string());

                let fallback = args
                    .get("f")
                    .and_then(serde_json::Value::as_str)
                    .map(|s| s.to_string());

                let translation = translation_copy
                    .get_translation(
                        GetTranslation {
                            namespace,
                            fallback,
                            key,
                        },
                        &lang,
                    )
                    .map_err(|e| TeraError::call_function("t", e))?;

                Ok(serde_json::Value::String(translation.to_string()))
            },
        )
    }

    fn find_key(&self, language: &str, namespace: &str, key: &str) -> Option<String> {
        self.translations
            .get(language)
            .and_then(|map| map.get(&(namespace.to_string() + ".json")))
            .and_then(|map| map.get(key))
            .map(|s| s.to_string())
    }

    // Look up a v2 custom translation. Namespaces here are bare (e.g. "common"),
    // unlike the embedded translations which are keyed by file name ("common.json").
    fn find_key_v2(&self, language: &str, namespace: &str, key: &str) -> Option<String> {
        self.custom_translations_v2
            .get(language)
            .and_then(|namespaces| namespaces.get(namespace))
            .and_then(|map| map.get(key))
            .map(|s| s.to_string())
    }
}

#[derive(Clone)]
pub struct GetTranslation {
    pub(crate) namespace: Option<String>,
    pub(crate) fallback: Option<String>,
    pub(crate) key: String,
}

#[cfg(test)]
mod test {

    use repository::{
        mock::MockDataInserts, test_db::setup_all, PreferenceRow, PreferenceRowRepository,
    };

    use crate::{
        localisations::{GetTranslation, LocalisationsService},
        preference::{CustomTranslations, CustomTranslationsV2, Preference},
    };

    #[actix_rt::test]
    async fn test_translations() {
        let (_, storage_connection, _, _) =
            setup_all("get_translations", MockDataInserts::none()).await;

        let service = LocalisationsService::new();
        let localisations = service.get_localisations(&storage_connection).unwrap();
        // test loading localisations
        // note these translations might change if translations change in the front end. In this case, these will need to be updated.
        let lang = "fr";
        let args = GetTranslation {
            namespace: Some("common".to_string()),
            fallback: Some("fallback".to_string()),
            key: "button.close".to_string(),
        };

        // test correct translation
        let translated_value = localisations.get_translation(args, lang).unwrap();
        assert_eq!("Fermer", translated_value);
        // test wrong key fallback
        let args = GetTranslation {
            namespace: Some("common".to_string()),
            fallback: Some("fallback wrong key".to_string()),
            key: "button.close-non-existent-key".to_string(),
        };
        let translated_value = localisations.get_translation(args, lang).unwrap();
        assert_eq!("fallback wrong key", translated_value);
        // // test missing translation in dialect falls back to base language
        let args = GetTranslation {
            namespace: Some("common".to_string()),
            fallback: Some("fallback".to_string()),
            key: "button.close".to_string(),
        };
        let lang = "fr-MISSING_DIALECT";
        let translated_value = localisations.get_translation(args, lang).unwrap();
        assert_eq!("Fermer", translated_value);
        // // test wrong language dir falls back to english translation
        let args = GetTranslation {
            namespace: Some("common".to_string()),
            fallback: Some("fallback wrong key".to_string()),
            key: "button.close".to_string(),
        };
        let lang = "non_existent_lang";
        let translated_value = localisations.get_translation(args, lang).unwrap();
        assert_eq!("Close", translated_value);
        // test no translation in namespace falls back to common.json namespace
        let lang = "fr";
        let args = GetTranslation {
            namespace: Some("common-non-existent-file".to_string()),
            fallback: Some("fallback wrong namespace".to_string()),
            key: "button.close".to_string(),
        };
        let translated_value = localisations.get_translation(args, lang).unwrap();
        assert_eq!("Fermer", translated_value);
        // test other lang file
        let lang = "es";
        let args = GetTranslation {
            namespace: Some("common".to_string()),
            fallback: Some("fallback".to_string()),
            key: "button.close".to_string(),
        };
        let translated_value = localisations.get_translation(args.clone(), lang).unwrap();
        assert_eq!("Cerrar", translated_value);

        // test custom translations take precedence
        PreferenceRowRepository::new(&storage_connection)
            .upsert_one(&PreferenceRow {
                id: "custom_translation".to_string(),
                store_id: None,
                key: CustomTranslations.key().to_string(),
                value: r#"{"button.close":"Custom Button"}"#.to_string(),
            })
            .unwrap();
        // reinitialise localisations with pref in place
        let localisations = service.get_localisations(&storage_connection).unwrap();
        let translated_value = localisations.get_translation(args, lang).unwrap();
        assert_eq!("Custom Button", translated_value);

        // test no translation and no fallback results in panic
        let lang = "fr";
        let args = GetTranslation {
            namespace: Some("common".to_string()),
            fallback: None,
            key: "non-existent-key".to_string(),
        };
        assert!(localisations.get_translation(args, lang).is_err())
    }

    #[actix_rt::test]
    async fn test_v2_custom_translations() {
        let (_, storage_connection, _, _) =
            setup_all("get_translations_v2", MockDataInserts::none()).await;

        let service = LocalisationsService::new();

        // v2 custom translations: per language + namespace
        PreferenceRowRepository::new(&storage_connection)
            .upsert_one(&PreferenceRow {
                id: "custom_translations_v2".to_string(),
                store_id: None,
                key: CustomTranslationsV2.key().to_string(),
                value: r#"{
                    "fr": { "common": { "button.close": "FR Custom" } },
                    "en": { "common": { "button.close": "EN Custom" } }
                }"#
                .to_string(),
            })
            .unwrap();

        let localisations = service.get_localisations(&storage_connection).unwrap();

        let args = |key: &str| GetTranslation {
            namespace: Some("common".to_string()),
            fallback: Some("fallback".to_string()),
            key: key.to_string(),
        };

        // v2 override wins over the embedded translation for that language
        assert_eq!(
            "FR Custom",
            localisations.get_translation(args("button.close"), "fr").unwrap()
        );
        assert_eq!(
            "EN Custom",
            localisations.get_translation(args("button.close"), "en").unwrap()
        );

        // A language without a v2 override falls back to its OWN embedded
        // translation, NOT another language's custom override.
        assert_eq!(
            "Cerrar",
            localisations.get_translation(args("button.close"), "es").unwrap()
        );

        // Dialect with no v2 override falls back to the base language's v2.
        assert_eq!(
            "FR Custom",
            localisations
                .get_translation(args("button.close"), "fr-MISSING_DIALECT")
                .unwrap()
        );

        // A key with no v2 override uses the embedded translation.
        assert_eq!(
            "Annuler",
            localisations
                .get_translation(
                    GetTranslation {
                        namespace: Some("common".to_string()),
                        fallback: Some("fallback".to_string()),
                        // button.close is overridden above, use a different key
                        key: "button.cancel".to_string(),
                    },
                    "fr"
                )
                .unwrap()
        );
    }
}
