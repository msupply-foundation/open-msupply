use serde_json::Value;

use crate::localisations::{GetTranslation, Localisations, TranslationError};

const UNIQUE_TRANSLATE_KEY: &str = "T#";

pub fn crawl_and_translate(
    json: &mut Value,
    localisations: &Localisations,
    user_language: &str,
) -> Result<(), TranslationError> {
    match json {
        Value::String(text) => {
            if let Some(key) = text.strip_prefix(UNIQUE_TRANSLATE_KEY) {
                *text = localisations.get_translation(
                    GetTranslation {
                        namespace: None,
                        fallback: Some(key.to_string()),
                        key: key.to_string(),
                    },
                    user_language,
                )?
            } else {
                ()
            };
            Ok(())
        }
        Value::Array(array) => {
            for item in array {
                crawl_and_translate(item, localisations, user_language)?;
            }
            Ok(())
        }
        Value::Object(map) => {
            for (_, v) in map.iter_mut() {
                crawl_and_translate(v, localisations, user_language)?;
            }
            Ok(())
        }

        Value::Null => Ok(()),
        Value::Bool(_) => Ok(()),
        Value::Number(_) => Ok(()),
    }
}

#[cfg(test)]
mod json_translate_test {
    use crate::{json_translate::crawl_and_translate, service_provider::ServiceProvider};
    use repository::{mock::MockDataInserts, test_db::setup_all};
    #[actix_rt::test]
    async fn json_translate_test() {
        let (_, connection, connection_manager, _) =
            setup_all("json_translate_test", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);

        let mut serialised_json: tera::Value = serde_json::json!({
            "key": "T#auth.alert-title",
            "nested": {
                "key": "T#approval-status.pending",
                "untranslated_key": "untranslated_value"
            },
            "list": ["T#button.add-form", "no-translation"]
        });

        let expected = serde_json::json!({
            "key": "Authentication Error",
            "nested": {
                "key": "Pending",
                "untranslated_key": "untranslated_value"
            },
            "list": ["Add Form", "no-translation"]
        });

        let localisations = service_provider
            .localisations_service
            .get_localisations(&connection)
            .unwrap();

        crawl_and_translate(&mut serialised_json, &localisations, "en").unwrap();

        assert_eq!(serialised_json, expected);
    }
}
