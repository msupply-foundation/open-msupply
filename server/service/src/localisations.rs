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
        let key = args.get("k").and_then(serde_json::Value::as_str).unwrap_or("");
        let language: &str = args.get("l").and_then(serde_json::Value::as_str).unwrap_or("");
        let namespace = args.get("n").and_then(serde_json::Value::as_str).unwrap_or("");
        let fallback = args.get("f").and_then(serde_json::Value::as_str);

        // make cascading array of fallback options:
        for (language, namespace, key) in [
            // first look for key in nominated namespace
            (language, namespace, key), 
            // then look for key in common.json
            (language, "common.json", key), 
            // then look for key in nominated namespace in en
            ("en", namespace, key), 
            // then look for key in common.json in en
            ("en", "common.json", key),             
            ] {
            match self.find_key(language, namespace, key) {
                Some(string) => return Ok(string),
                None => continue,
            }
        };
        if let Some(fallback_text) = fallback {
            // if none of the options above are available, fallback to the english fallback in html
            return Ok(fallback_text.to_string())
        } else {
            // throw error if no translation found above (and don't render report)
            Err(TranslationError)
        }

    }

    fn find_key(&self, language: &str, namespace: &str, key: &str) -> Option<String> {
            self.translations
            .get(language)
            .and_then(|map| map.get(namespace))
            .and_then(|map| map.get(key))
            .cloned()
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
        args.insert("k".to_string(), serde_json::Value::String("button.close".to_owned()));
        args.insert("l".to_string(), serde_json::Value::String("fr".to_owned()));
        args.insert("n".to_string(), serde_json::Value::String("common.json".to_owned()));
        args.insert("f".to_string(), serde_json::Value::String("fallback".to_owned()));
        // test correct translation
        let translated_value = localisations.get_translation(&args).unwrap();      
        assert_eq!("Fermer", translated_value);
        // test wrong key fallback
        args.insert("k".to_string(),serde_json::Value::String("button.close-non-existent-key".to_owned()));
        args.insert("f".to_string(), serde_json::Value::String("fallback wrong key".to_owned()));
        let translated_value = localisations.get_translation(&args).unwrap();      
        assert_eq!("fallback wrong key", translated_value);        
        // // test wrong language dir
        args.insert("k".to_string(), serde_json::Value::String("button.close".to_owned()));
        args.insert("l".to_string(), serde_json::Value::String("fr-non-existent-lang".to_owned()));
        args.insert("f".to_string(), serde_json::Value::String("fallback wrong lang dir".to_owned()));
        let translated_value = localisations.get_translation(&args).unwrap();      
        assert_eq!("fallback wrong lang dir", translated_value);
        // test no language and no fallback falls back to english translation
        let mut args = HashMap::new();
        args.insert("k".to_string(), serde_json::Value::String("button.close".to_owned()));
        args.insert("n".to_string(), serde_json::Value::String("common.json".to_owned()));
        let translated_value = localisations.get_translation(&args).unwrap();      
        assert_eq!("Close", translated_value);
        // test no translation in namespace falls back to common.json namespace
        args.insert("l".to_string(), serde_json::Value::String("fr".to_owned()));
        args.insert("n".to_string(), serde_json::Value::String("common.json-non-existent-file".to_owned()));
        args.insert("f".to_string(), serde_json::Value::String("fallback wrong namespace".to_owned()));
        let translated_value = localisations.get_translation(&args).unwrap();      
        assert_eq!("Fermer", translated_value);
        // test other lang file
        args.insert("l".to_string(), serde_json::Value::String("es".to_owned()));
        args.insert("n".to_string(), serde_json::Value::String("common.json".to_owned()));
        args.insert("f".to_string(), serde_json::Value::String("fallback".to_owned()));
        let translated_value = localisations.get_translation(&args).unwrap();      
        assert_eq!("Cerrar", translated_value);
        // test no translation and no fallback results in panic
        let mut args = HashMap::new();
        args.insert("k".to_string(), serde_json::Value::String("non-existent-key".to_owned()));
        args.insert("l".to_string(), serde_json::Value::String("fr".to_owned()));
        args.insert("n".to_string(), serde_json::Value::String("common.json".to_owned()));
        assert!(localisations.get_translation(&args).is_err())
    }
}
