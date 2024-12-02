use repository::FormSchemaJson;
use serde_json::Value;

use crate::localisations::{GetTranslation, Localisations, TranslationError};

const UNIQUE_TRANSLATE_KEY: &str = "T#";

const LANG: &str = "fr";

pub fn translate_json(
    argument_schema: FormSchemaJson,
    translation_service: &Box<Localisations>,
) -> Result<FormSchemaJson, TranslationError> {
    let mut json_schema = argument_schema.json_schema.clone();
    crawl_and_translate(&mut json_schema, translation_service)?;
    let mut ui_schema = argument_schema.ui_schema.clone();
    crawl_and_translate(&mut ui_schema, translation_service)?;

    Ok(FormSchemaJson {
        id: argument_schema.id,
        r#type: argument_schema.r#type,
        json_schema: json_schema.into(),
        ui_schema: ui_schema.into(),
    })
}

fn crawl_and_translate(
    json: &mut Value,
    translation_service: &Box<Localisations>,
) -> Result<(), TranslationError> {
    match json {
        Value::String(text) => {
            if let Some(key) = text.strip_prefix(UNIQUE_TRANSLATE_KEY) {
                *text = translation_service.get_translation(
                    GetTranslation {
                        namespace: None,
                        fallback: Some(key.to_string()),
                        key: key.to_string(),
                    },
                    LANG,
                )?
            } else {
                ()
            };
            Ok(())
        }
        Value::Array(array) => {
            for item in array {
                crawl_and_translate(item, translation_service)?;
            }
            Ok(())
        }
        Value::Object(map) => {
            for (_, v) in map.iter_mut() {
                crawl_and_translate(v, translation_service)?;
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
        let (_, _, connection_manager, _) =
            setup_all("json_translate_test", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");

        // TODO mock translation service in case key values change
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

        crawl_and_translate(&mut serialised_json, &service_provider.translations_service).unwrap();

        assert_eq!(serialised_json, expected);
    }
}
