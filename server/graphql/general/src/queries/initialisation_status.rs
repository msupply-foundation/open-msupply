use async_graphql::Enum;
pub use async_graphql::*;
use graphql_core::ContextExt;
use service::sync::sync_status::status::InitialisationStatus;

pub struct InitialisationStatusNode {
    status: InitialisationStatusType,
    site_name: SiteName,
}

enum SiteName {
    Known(Option<String>),
    /// Read only if the query asks for it, so a status-only query needs no
    /// database connection
    ReadWhenAsked,
}

#[Object]
impl InitialisationStatusNode {
    pub async fn status(&self) -> InitialisationStatusType {
        self.status
    }

    pub async fn site_name(&self, ctx: &Context<'_>) -> Result<Option<String>> {
        match &self.site_name {
            SiteName::Known(site_name) => Ok(site_name.clone()),
            SiteName::ReadWhenAsked => {
                let service_provider = ctx.service_provider();
                let ctx = service_provider.basic_context()?;
                Ok(Some(
                    service_provider
                        .sync_status_service
                        .get_initialised_site_name(&ctx)?,
                ))
            }
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum InitialisationStatusType {
    /// Fuly initialised
    Initialised,
    /// Sync settings were set and sync was attempted at least once
    Initialising,
    /// Sync settings are not set and sync was not attempted
    PreInitialisation,
}

pub(crate) fn initialisation_status(ctx: &Context<'_>) -> Result<InitialisationStatusNode> {
    let service_provider = ctx.service_provider();
    let ctx = service_provider.basic_context()?;
    let status = service_provider
        .sync_status_service
        .get_initialisation_status(&ctx)?;

    Ok(InitialisationStatusNode::from_domain(status))
}

/// The operational schema is only served once the site is initialised, and the
/// server never goes back to initialisation mode, so the answer needs no
/// sync log reads. The front end asks for this before every page load.
pub(crate) fn operational_initialisation_status() -> InitialisationStatusNode {
    InitialisationStatusNode {
        status: InitialisationStatusType::Initialised,
        site_name: SiteName::ReadWhenAsked,
    }
}

impl InitialisationStatusNode {
    pub(crate) fn from_domain(
        initialisation_status: InitialisationStatus,
    ) -> InitialisationStatusNode {
        use InitialisationStatus as from;
        use InitialisationStatusType as to;
        let status = match initialisation_status {
            from::Initialised(site_name) => {
                return InitialisationStatusNode {
                    site_name: SiteName::Known(Some(site_name)),
                    status: to::Initialised,
                };
            }
            from::Initialising => to::Initialising,
            from::PreInitialisation => to::PreInitialisation,
        };

        InitialisationStatusNode {
            status,
            site_name: SiteName::Known(None),
        }
    }
}

#[cfg(test)]
mod test {
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{KeyType, KeyValueStoreRepository, mock::MockDataInserts};
    use serde_json::json;

    use crate::{GeneralMutations, GeneralQueries};

    #[actix_rt::test]
    async fn operational_initialisation_status_reads_no_sync_logs() {
        let (_, connection, _, settings) = setup_graphql_test(
            GeneralQueries,
            GeneralMutations,
            "operational_initialisation_status_reads_no_sync_logs",
            MockDataInserts::none(),
        )
        .await;
        let variables: Option<serde_json::Value> = None;
        let query = r#"query { initialisationStatus { status siteName } }"#;
        let key_value_store = KeyValueStoreRepository::new(&connection);
        // Sync settings only count as set once every required key is there.
        key_value_store
            .set_string(KeyType::SettingsSyncUrl, Some("http://central".to_string()))
            .unwrap();
        key_value_store
            .set_string(
                KeyType::SettingsSyncPasswordSha256,
                Some("hash".to_string()),
            )
            .unwrap();
        key_value_store
            .set_i64(KeyType::SettingsSyncIntervalSeconds, Some(60))
            .unwrap();
        let set_username = |name: &str| {
            key_value_store
                .set_string(KeyType::SettingsSyncUsername, Some(name.to_string()))
                .unwrap()
        };

        // No sync logs at all: the operational schema answers from what it is,
        // not from the logs.
        set_username("site_one");
        assert_graphql_query!(
            &settings,
            query,
            &variables,
            &json!({ "initialisationStatus": { "status": "INITIALISED", "siteName": "site_one" } }),
            None
        );

        // The site name follows the sync settings, which an admin can change
        // while the server runs.
        set_username("site_two");
        assert_graphql_query!(
            &settings,
            query,
            &variables,
            &json!({ "initialisationStatus": { "siteName": "site_two" } }),
            None
        );
    }
}
