use crate::{
    service_provider::ServiceProvider,
    sync::CentralServerConfig,
    sync_v7::api::{
        site_info::{SiteInfoInput, SiteInfoOutput},
        VERSION,
    },
};
use repository::{
    syncv7::SyncError, KeyType, KeyValueStoreRepository, Pagination, SiteFilter, SiteRepository,
    SiteRow, SiteRowRepository, StorageConnection, StringFilter,
};

/// TODO: revisit token format — UUID v4 for now.
pub fn get_site_info(
    service_provider: &ServiceProvider,
    input: SiteInfoInput,
) -> Result<SiteInfoOutput, SyncError> {
    if !CentralServerConfig::is_central_server() {
        return Err(SyncError::NotACentralServer);
    }

    if input.version != VERSION {
        return Err(SyncError::SyncVersionMismatch(
            VERSION,
            VERSION,
            input.version,
        ));
    }

    let ctx = service_provider
        .basic_context()
        .map_err(|e| SyncError::Other(e.to_string()))?;

    let site = get_site_by_name(&ctx.connection, &input.name)?.ok_or(SyncError::Authentication)?;

    if site.hashed_password != input.password_sha256 {
        return Err(SyncError::Authentication);
    }

    if site.token.is_some() {
        return Err(SyncError::Authentication);
    }

    let hardware_id = match &site.hardware_id {
        Some(existing) if existing != &input.hardware_id => {
            return Err(SyncError::Authentication);
        }
        _ => input.hardware_id.clone(),
    };

    let token = util::uuid::uuid();

    let updated = SiteRow {
        hardware_id: Some(hardware_id),
        token: Some(token.clone()),
        ..site.clone()
    };
    SiteRowRepository::new(&ctx.connection)
        .upsert(&updated)
        .map_err(SyncError::DatabaseError)?;

    let central_site_id = get_central_site_id(&ctx.connection)?;

    Ok(SiteInfoOutput {
        token,
        site_id: site.id,
        central_site_id,
    })
}

fn get_site_by_name(
    connection: &StorageConnection,
    name: &str,
) -> Result<Option<SiteRow>, SyncError> {
    let rows = SiteRepository::new(connection)
        .query(
            Pagination::one(),
            Some(SiteFilter::new().name(StringFilter::equal_to(name))),
            None,
        )
        .map_err(SyncError::DatabaseError)?;
    Ok(rows.into_iter().next())
}

fn get_central_site_id(connection: &StorageConnection) -> Result<i32, SyncError> {
    KeyValueStoreRepository::new(connection)
        .get_i32(KeyType::SettingsSyncCentralServerSiteId)
        .map_err(SyncError::DatabaseError)?
        .ok_or_else(|| SyncError::Other("Central site id not configured".to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        service_provider::ServiceProvider,
        sync::test_util_set_is_central_server,
        sync_v7::api::{site_info::SiteInfoInput, VERSION},
    };
    use repository::{mock::MockDataInserts, test_db::setup_all};

    const SITE_NAME: &str = "test_site";
    const PASSWORD: &str = "hashed_password_value";
    const HARDWARE_ID: &str = "hw-id-test";
    const CENTRAL_SITE_ID: i32 = 42;

    fn test_site(connection: &StorageConnection, token: Option<String>) -> SiteRow {
        let site = SiteRow {
            id: 1,
            og_id: None,
            code: "test_code".to_string(),
            name: SITE_NAME.to_string(),
            hashed_password: PASSWORD.to_string(),
            hardware_id: None,
            token,
        };
        SiteRowRepository::new(connection).upsert(&site).unwrap();
        KeyValueStoreRepository::new(connection)
            .set_i32(
                KeyType::SettingsSyncCentralServerSiteId,
                Some(CENTRAL_SITE_ID),
            )
            .unwrap();
        site
    }

    fn input() -> SiteInfoInput {
        SiteInfoInput {
            version: VERSION,
            name: SITE_NAME.to_string(),
            password_sha256: PASSWORD.to_string(),
            hardware_id: HARDWARE_ID.to_string(),
        }
    }

    #[actix_rt::test]
    async fn get_site_info_allocates_token_and_sets_hardware_id() {
        let (_, connection, connection_manager, _) = setup_all(
            "get_site_info_allocates_token_and_sets_hardware_id",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);
        test_site(&connection, None);
        let service_provider = ServiceProvider::new(connection_manager);
        let output = get_site_info(&service_provider, input()).unwrap();

        assert!(!output.token.is_empty());
        assert_eq!(output.site_id, 1);
        assert_eq!(output.central_site_id, CENTRAL_SITE_ID);

        let stored = SiteRowRepository::new(&connection)
            .find_one_by_id(1)
            .unwrap()
            .unwrap();
        assert_eq!(stored.token.as_deref(), Some(output.token.as_str()));
        assert_eq!(stored.hardware_id.as_deref(), Some(HARDWARE_ID));
    }

    #[actix_rt::test]
    async fn get_site_info_rejects_invalid_auth() {
        let (_, connection, connection_manager, _) = setup_all(
            "get_site_info_rejects_invalid_auth",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);
        let service_provider = ServiceProvider::new(connection_manager);

        // Bad password
        test_site(&connection, None);
        let mut bad = input();
        bad.password_sha256 = "wrong".to_string();
        let err = super::get_site_info(&service_provider, bad).unwrap_err();
        assert!(matches!(err, SyncError::Authentication));

        // Token already set
        test_site(&connection, Some("existing_token".to_string()));
        let err = super::get_site_info(&service_provider, input()).unwrap_err();
        assert!(matches!(err, SyncError::Authentication));
    }
}
