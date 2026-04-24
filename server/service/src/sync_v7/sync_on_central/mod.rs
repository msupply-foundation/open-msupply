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
