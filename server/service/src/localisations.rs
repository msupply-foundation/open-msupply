use repository::StorageConnection;
use std::collections::HashMap;
use tera::{Error as TeraError, Function};
use thiserror::Error;

use rust_embed::RustEmbed;

use crate::preference::{CustomTranslations, Preference, PreferenceError};

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

impl LocalisationsService {
    pub fn new() -> Self {
        let mut localisations = Localisations {
            translations: HashMap::new(),
            custom_translations: HashMap::new(),
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
    pub custom_translations: HashMap<String, String>,
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
                            "Failed to parse JSON localisations file {:?}. Backend/report translations will be unavailable due to: {:?}",
                            file,
                            e
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
        // use the custom translation key if it exists
        if let Some(value) = self.custom_translations.get(&key) {
            return Ok(value.clone());
        }
        // otherwise use default oms translations
        let default_namespace = "common".to_string();
        let default_language = "en".to_string();

        let language_with_dialect = language.to_string();
        // e.g. if language is "en-GB" then base_language is "en"
        let base_language = language.split('-').next().unwrap_or(language).to_string();

        let namespace = namespace.unwrap_or(default_namespace.clone());

        // make cascading array of fallback options:
        for (language, namespace, key) in [
            // first look for key in nominated namespace
            (&language_with_dialect, &namespace, &key),
            // then look for key in common.json
            (&language_with_dialect, &default_namespace, &key),
            // then look for key in nominated namespace in base lang
            (&base_language, &namespace, &key),
            // then look for key in common.json in base lang
            (&base_language, &default_namespace, &key),
            // then look for key in nominated namespace in en
            (&default_language, &namespace, &key),
            // then look for key in common.json in en
            (&default_language, &default_namespace, &key),
        ] {
            match self.find_key(language, &namespace, &key) {
                Some(string) => return Ok(string),
                None => continue,
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
        preference::{CustomTranslations, Preference},
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
}
