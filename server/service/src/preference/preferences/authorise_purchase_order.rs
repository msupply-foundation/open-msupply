use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct AuthorisePurchaseOrder;

impl Preference for AuthorisePurchaseOrder {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::AuthorisePurchaseOrder
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn allows_store_override(&self) -> bool {
        true
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        preference::{
            query_preference::{query_global, query_store},
            PreferenceDescription, PreferenceService, PreferenceServiceTrait,
        },
        sync::test_util_set_is_central_server,
    };
    use repository::{
        mock::{mock_store_a, mock_store_b, MockDataInserts},
        test_db::setup_all,
    };

    #[actix_rt::test]
    async fn store_override_falls_back_to_global() {
        let (_, connection, connection_manager, _) = setup_all(
            "authorise_purchase_order_store_override",
            MockDataInserts::none().names().stores(),
        )
        .await;
        test_util_set_is_central_server(true);

        let store_a = mock_store_a().id;
        let store_b = mock_store_b().id;
        let load = |store_id: Option<&str>| {
            AuthorisePurchaseOrder
                .load(&connection, store_id.map(str::to_string))
                .unwrap()
        };

        // Nothing stored: the built-in default, globally and for every store.
        assert!(!load(None));
        assert!(!load(Some(&store_a)));

        // The global value is every store's default.
        AuthorisePurchaseOrder
            .upsert(&connection, true, None)
            .unwrap();
        assert!(load(None));
        assert!(load(Some(&store_a)));
        assert!(load(Some(&store_b)));

        // A store's override wins for that store alone; the global row is untouched.
        AuthorisePurchaseOrder
            .upsert(&connection, false, Some(store_a.clone()))
            .unwrap();
        assert!(!load(Some(&store_a)));
        assert!(load(Some(&store_b)));
        assert!(load(None));

        // One row per scope: the override never overwrites the global row.
        let key = AuthorisePurchaseOrder.key_str();
        assert_eq!(
            query_global(&connection, &key).unwrap().unwrap().value,
            "true"
        );
        assert_eq!(
            query_store(&connection, &key, &store_a)
                .unwrap()
                .unwrap()
                .value,
            "false"
        );
        assert!(query_store(&connection, &key, &store_b).unwrap().is_none());

        // Listed for both scopes, the store list carrying each store's effective value.
        let service = PreferenceService {};
        let is_this = |d: &PreferenceDescription| matches!(d.key, PrefKey::AuthorisePurchaseOrder);
        let global = service
            .get_preference_descriptions(
                connection_manager.connection().unwrap(),
                None,
                PreferenceType::Global,
            )
            .unwrap();
        assert_eq!(global.iter().find(|d| is_this(d)).unwrap().value, true);

        for (store_id, expected) in [(&store_a, false), (&store_b, true)] {
            let store = service
                .get_preference_descriptions(
                    connection_manager.connection().unwrap(),
                    Some(store_id.clone()),
                    PreferenceType::Store,
                )
                .unwrap();
            assert_eq!(store.iter().find(|d| is_this(d)).unwrap().value, expected);
        }
    }
}
