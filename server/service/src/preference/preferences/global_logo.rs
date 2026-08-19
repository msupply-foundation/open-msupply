use repository::StorageConnection;

use crate::preference::{
    upsert_helpers::upsert_global, PrefKey, Preference, PreferenceType, PreferenceValueType,
    UpsertPreferenceError,
};

/// Max length of the stored data-URL string (~250KB). Data URLs are ASCII, so
/// chars == bytes. Must match MAX_DATA_URL_LENGTH in the client's
/// EditImagePreference.tsx. Kept small: the value rides inside an ordinary
/// JSON sync batch (no chunking/resume), so it must stay cheap on poor links.
pub const MAX_GLOBAL_LOGO_DATA_URL_LENGTH: usize = 250 * 1024;

pub const ALLOWED_LOGO_DATA_URL_PREFIXES: &[&str] = &[
    "data:image/png;base64,",
    "data:image/jpeg;base64,",
    "data:image/gif;base64,",
    "data:image/svg+xml;base64,",
];

/// Logo shown on printed reports when the store has no logo of its own
/// (StoreLogoLoader substitutes it wherever store.logo is null).
/// Stored as a base64 data URL; "" means not set.
pub struct GlobalLogo;

impl Preference for GlobalLogo {
    type Value = String;

    fn key(&self) -> PrefKey {
        PrefKey::GlobalLogo
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Image
    }

    // Custom upsert to validate type and size. The client validates before
    // upload; this is the backstop for any other caller.
    fn upsert(
        &self,
        connection: &StorageConnection,
        value: Self::Value,
        _store_id: Option<String>,
    ) -> Result<(), UpsertPreferenceError> {
        validate_logo_data_url(&value)
            .map_err(|reason| UpsertPreferenceError::InvalidValue(self.key_str(), reason))?;

        let serialised_value = serde_json::to_string(&value)
            .map_err(|e| UpsertPreferenceError::SerializeError(self.key_str(), e.to_string()))?;

        upsert_global(connection, self.key_str(), serialised_value)
    }
}

fn validate_logo_data_url(value: &str) -> Result<(), String> {
    // Empty clears the logo
    if value.is_empty() {
        return Ok(());
    }
    if !ALLOWED_LOGO_DATA_URL_PREFIXES
        .iter()
        .any(|prefix| value.starts_with(prefix))
    {
        return Err("must be a png/jpeg/gif/svg base64 data URL".to_string());
    }
    if value.len() > MAX_GLOBAL_LOGO_DATA_URL_LENGTH {
        return Err(format!(
            "exceeds maximum size of {MAX_GLOBAL_LOGO_DATA_URL_LENGTH} bytes"
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use repository::{mock::MockDataInserts, test_db::setup_all};

    use super::*;
    use crate::{
        preference::{upsert_preferences, UpsertPreferences},
        service_provider::ServiceProvider,
        sync::test_util_set_is_central_server,
    };

    #[actix_rt::test]
    async fn global_logo_upsert_validation() {
        let (_, _, connection_manager, _) =
            setup_all("global_logo_upsert_validation", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        test_util_set_is_central_server(true);

        // Valid data URL round-trips
        let logo = "data:image/png;base64,iVBORw0KGgo=".to_string();
        upsert_preferences(
            &ctx,
            UpsertPreferences {
                global_logo: Some(logo.clone()),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(GlobalLogo.load(&ctx.connection, None).unwrap(), logo);

        // Wrong mime type rejected
        let result = GlobalLogo.upsert(
            &ctx.connection,
            "data:text/html;base64,PHNjcmlwdD4=".to_string(),
            None,
        );
        assert!(matches!(
            result,
            Err(UpsertPreferenceError::InvalidValue(_, _))
        ));

        // Bare base64 (no data-URL prefix) rejected
        let result = GlobalLogo.upsert(&ctx.connection, "iVBORw0KGgo=".to_string(), None);
        assert!(matches!(
            result,
            Err(UpsertPreferenceError::InvalidValue(_, _))
        ));

        // Oversized rejected
        let oversized = format!(
            "data:image/png;base64,{}",
            "A".repeat(MAX_GLOBAL_LOGO_DATA_URL_LENGTH)
        );
        let result = GlobalLogo.upsert(&ctx.connection, oversized, None);
        assert!(matches!(
            result,
            Err(UpsertPreferenceError::InvalidValue(_, _))
        ));

        // Empty string clears
        GlobalLogo
            .upsert(&ctx.connection, "".to_string(), None)
            .unwrap();
        assert_eq!(GlobalLogo.load(&ctx.connection, None).unwrap(), "");

        // Not a central server: rejected (validation passes, upsert_global refuses)
        test_util_set_is_central_server(false);
        let result = GlobalLogo.upsert(
            &ctx.connection,
            "data:image/png;base64,iVBORw0KGgo=".to_string(),
            None,
        );
        assert_eq!(result, Err(UpsertPreferenceError::NotACentralServer));
    }
}
