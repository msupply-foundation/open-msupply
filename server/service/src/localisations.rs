use std::collections::HashMap;
use std::error::Error;
use serde_yaml::Value;

use rust_embed::RustEmbed;

#[derive(RustEmbed)]
// Relative to server/Cargo.toml
#[folder = "../../client/packages/common/src/intl/locales"]
pub struct EmbeddedLocalisations;

#[derive(Debug)]
pub struct TranslationError;

impl std::fmt::Display for TranslationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "No translation")
    }
}

impl Error for TranslationError {}


// struct to manage translations
#[derive(Clone)]

pub struct Localisations {
    pub translations: HashMap<String, HashMap<String, HashMap<String, String>>>,
}

pub struct TranslationStrings {
    pub translations: HashMap<String, Value>,
}

impl Default for Localisations {
    fn default() -> Self {
        Self::new()
    }
}

impl Localisations {

    // Creates a new Localisations struct
    pub fn new() -> Self {
        let mut localisations = Localisations {
            translations: HashMap::new(),
        };
        let _ = localisations.load_translations();
        localisations
    }

    // Load translations from embedded files
    pub fn load_translations(&mut self) -> Result<(), std::io::Error> {
        // add read all namespace file names within locales
        for file in EmbeddedLocalisations::iter() {
                let file_namespace = file.split('/').nth(1).unwrap_or_default().to_string();
                let language = file.split('/').nth(0).unwrap_or_default().to_string();
                if let Some(content) = EmbeddedLocalisations::get(&file) {
                    let json_data = content.data;
                    let translations: HashMap<String, String> = serde_json::from_slice(&json_data).unwrap_or_else(|e| {
                        log::error!("Failed to parse JSON file {:?}: {:?}", file, e);
                        HashMap::new()
                    });
                    self.translations
                    .entry(language)
                    .or_default()
                    .insert(file_namespace, translations);
            }
        }
        Ok(())
    }

    // Get a translation for a given key and language
    // next need to add fallback and namespace to get Translation function
    pub fn get_translation(&self, args: &HashMap<String, serde_json::Value> ) -> Result<String, TranslationError> {
        let key = args.get("key").and_then(serde_json::Value::as_str).unwrap_or("");
        let lang = args.get("lang").and_then(serde_json::Value::as_str).unwrap_or("");
        let namespace = args.get("namespace").and_then(serde_json::Value::as_str).unwrap_or("");
        let fallback = args.get("fallback").and_then(serde_json::Value::as_str);

        // make cascading array of fallback options:
        for (lang, namespace, key, fallback) in [
            // first look for key in nomionaed namespace
            (lang, namespace, key, None), 
            // then look for key in common.json
            (lang, "common.json", key, None), 
            // then look for fallback
            ("", "", "", fallback ),
            // then look for key in nominated namespace in en
            ("en", namespace, key, None), 
            // then look for key in common.json in en
            ("en", "common.json", key, None),             
            ] {
            match self.find_key(lang, namespace, key, fallback) {
                Some(string) => return Ok(string),
                None => continue,
            }
        };
        // throw error if no translation found above (and don't render report)
        Err(TranslationError)
    }

    fn find_key(&self, lang: &str, namespace: &str, key: &str, fallback: Option<&str>) -> Option<String> {
        if let Some(fallback) = fallback {
            return Some(fallback.to_owned())
        } else {
            self.translations
            .get(lang)
            .and_then(|map| map.get(namespace))
            .and_then(|map| map.get(key))
            .cloned()
        }
    }
}

#[cfg(test)]
mod test {

use std::collections::HashMap;

use super::Localisations;


    #[test]
    fn test_translations() {
        let localisations = Localisations::new();
        // test loading localisations
        // note these translations might change if translations change in the front end. In this case, these will need to be updated.

        let mut args = HashMap::new();
        args.insert("key".to_string(), serde_json::Value::String("button.close".to_owned()));
        args.insert("lang".to_string(), serde_json::Value::String("fr".to_owned()));
        args.insert("namespace".to_string(), serde_json::Value::String("common.json".to_owned()));
        args.insert("fallback".to_string(), serde_json::Value::String("fallback".to_owned()));
        // test correct translation
        let translated_value = localisations.get_translation(&args).unwrap();      
        assert_eq!("Fermer", translated_value);
        // test wrong key fallback
        args.insert("key".to_string(),serde_json::Value::String("button.close-non-existent-key".to_owned()));
        args.insert("fallback".to_string(), serde_json::Value::String("fallback wrong key".to_owned()));
        let translated_value = localisations.get_translation(&args).unwrap();      
        assert_eq!("fallback wrong key", translated_value);        
        // // test wrong language dir
        args.insert("key".to_string(), serde_json::Value::String("button.close".to_owned()));
        args.insert("lang".to_string(), serde_json::Value::String("fr-non-existent-lang".to_owned()));
        args.insert("fallback".to_string(), serde_json::Value::String("fallback wrong lang dir".to_owned()));
        let translated_value = localisations.get_translation(&args).unwrap();      
        assert_eq!("fallback wrong lang dir", translated_value);
        // test no language and no fallback falls back to english translation
        let mut args = HashMap::new();
        args.insert("key".to_string(), serde_json::Value::String("button.close".to_owned()));
        args.insert("namespace".to_string(), serde_json::Value::String("common.json".to_owned()));
        let translated_value = localisations.get_translation(&args).unwrap();      
        assert_eq!("Close", translated_value);
        // test no translation in namespace falls back to common.json namespace
        args.insert("lang".to_string(), serde_json::Value::String("fr".to_owned()));
        args.insert("namespace".to_string(), serde_json::Value::String("common.json-non-existent-file".to_owned()));
        args.insert("fallback".to_string(), serde_json::Value::String("fallback wrong namespace".to_owned()));
        let translated_value = localisations.get_translation(&args).unwrap();      
        assert_eq!("Fermer", translated_value);
        // test other lang file
        args.insert("lang".to_string(), serde_json::Value::String("es".to_owned()));
        args.insert("namespace".to_string(), serde_json::Value::String("common.json".to_owned()));
        args.insert("fallback".to_string(), serde_json::Value::String("fallback".to_owned()));
        let translated_value = localisations.get_translation(&args).unwrap();      
        assert_eq!("Cerrar", translated_value);
        // test no translation and no fallback results in panic
        let mut args = HashMap::new();
        args.insert("key".to_string(), serde_json::Value::String("non-existent-key".to_owned()));
        args.insert("lang".to_string(), serde_json::Value::String("fr".to_owned()));
        args.insert("namespace".to_string(), serde_json::Value::String("common.json".to_owned()));
        assert!(localisations.get_translation(&args).is_err())
    }
}
