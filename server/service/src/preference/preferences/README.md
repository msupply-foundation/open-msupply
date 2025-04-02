# Preferences

When adding a new preference, first define a struct for it, and implement the `Preference` trait for it.

```rs
pub struct CustomStoreName;

impl Preference for CustomStoreName {
    // Required: define the type of the preference
    // Implement a custom default value if needed
    type Value = String;

    // Required: define a unique key
    fn key() -> &'static str {
        "custom_store_name"
    }

    // Optional - default is false
    // Use this if the preference should apply across the system
    fn global_only() -> bool {
        true
    }

    // Optional - default is bool
    // The type of the preference, for use in json_forms
    // If using a complex/custom type, you should instead implement json_schema()
    fn json_forms_input_type() -> String {
        "string".to_string()
    }



    // Optional
    // For complex types, implement json_schema() and ui_schema()
    fn json_schema() -> serde_json::Value {
        json!({
          "properties": {
            "value": {
                "type": Self::json_forms_input_type()
            }
          },
        })
    }

    fn ui_schema() -> serde_json::Value {
        json!({
          "type": "Control",
          "label": "label.value",
          "scope": "#/properties/value"
        })
    }
}
```

Next, add your new preference to the `Preferences` and `PreferenceRegistry` structs in the `mod.rs` file of this folder.

Add the preference to the `PreferencesNode` in the graphql layer to expose the preference for use in the UI.
