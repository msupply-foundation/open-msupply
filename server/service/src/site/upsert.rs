use crate::service_provider::ServiceContext;
use bcrypt::{hash, DEFAULT_COST};
use repository::{RepositoryError, SiteRow, SiteRowRepository, StorageConnection};

#[derive(PartialEq, Debug)]
pub enum UpsertSiteError {
    CodeRequired,
    NameRequired,
    PasswordRequired,
    DuplicateSiteName,
    DatabaseError(RepositoryError),
}

pub struct UpsertSite {
    pub id: i32,
    pub code: Option<String>,
    pub name: String,
    pub password: Option<String>,
}

pub fn upsert_site(ctx: &ServiceContext, input: UpsertSite) -> Result<SiteRow, UpsertSiteError> {
    ctx.connection
        .transaction_sync(|connection| {
            let repo = SiteRowRepository::new(connection);
            let existing = repo.find_one_by_id(input.id)?;

            validate(connection, &input, &existing)?;
            let row = generate(input, existing);
            repo.upsert(&row)?;

            Ok(row)
        })
        .map_err(|e| e.to_inner_error())
}

impl From<RepositoryError> for UpsertSiteError {
    fn from(error: RepositoryError) -> Self {
        UpsertSiteError::DatabaseError(error)
    }
}

fn validate(
    connection: &StorageConnection,
    input: &UpsertSite,
    existing: &Option<SiteRow>,
) -> Result<(), UpsertSiteError> {
    match (&input.code, existing) {
        (Some(code), _) if code.trim().is_empty() => return Err(UpsertSiteError::CodeRequired),
        (None, None) => return Err(UpsertSiteError::CodeRequired),
        _ => {}
    }

    if input.name.trim().is_empty() {
        return Err(UpsertSiteError::NameRequired);
    }

    if let Some(other) =
        SiteRowRepository::new(connection).find_one_by_name_case_insensitive(input.name.trim())?
    {
        if other.id != input.id {
            return Err(UpsertSiteError::DuplicateSiteName);
        }
    }

    match (&input.password, existing) {
        (Some(pw), _) if pw.trim().is_empty() => Err(UpsertSiteError::PasswordRequired),
        (None, None) => Err(UpsertSiteError::PasswordRequired),
        _ => Ok(()),
    }
}

fn generate(
    UpsertSite {
        id,
        code,
        name,
        password,
    }: UpsertSite,
    existing_site: Option<SiteRow>,
) -> SiteRow {
    let existing_og_id = existing_site.as_ref().and_then(|s| s.og_id.clone());
    let existing_code = existing_site.as_ref().map(|s| s.code.clone());
    let existing_hardware_id = existing_site.as_ref().and_then(|s| s.hardware_id.clone());
    let existing_token = existing_site.as_ref().and_then(|s| s.token.clone());
    let existing_sync_version = existing_site.as_ref().map(|s| s.sync_version);
    // Sync metadata is authored from v7 sync activity, not from this admin upsert;
    // preserve it so a name/password/code edit doesn't wipe it (#11784).
    let existing_app_name = existing_site.as_ref().and_then(|s| s.app_name.clone());
    let existing_app_version = existing_site.as_ref().and_then(|s| s.app_version.clone());
    let existing_last_connection = existing_site.as_ref().and_then(|s| s.last_connection_datetime);
    let existing_last_sync = existing_site.as_ref().and_then(|s| s.last_sync_datetime);
    let existing_first_sync = existing_site.as_ref().and_then(|s| s.first_sync_datetime);

    let hashed_password = match password {
        Some(pw) => hash(pw, DEFAULT_COST).expect("bcrypt hash failed"),
        None => existing_site
            .as_ref()
            .map(|s| s.hashed_password.clone())
            .unwrap_or_default(),
    };

    SiteRow {
        id,
        og_id: existing_og_id,
        code: code.or(existing_code).unwrap_or_default(),
        name: name.trim().to_string(),
        hashed_password,
        hardware_id: existing_hardware_id,
        token: existing_token,
        sync_version: existing_sync_version.unwrap_or_default(),
        app_name: existing_app_name,
        app_version: existing_app_version,
        last_connection_datetime: existing_last_connection,
        last_sync_datetime: existing_last_sync,
        first_sync_datetime: existing_first_sync,
    }
}

#[cfg(test)]
mod tests {
    use repository::{mock::MockDataInserts, test_db::setup_all, SiteRowRepository};

    use crate::service_provider::ServiceProvider;

    use super::*;

    #[actix_rt::test]
    async fn upsert_site_errors() {
        let (_, _, connection_manager, _) =
            setup_all("upsert_site_errors", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        assert_eq!(
            upsert_site(
                &context,
                UpsertSite {
                    id: 1,
                    code: None,
                    name: "Site A".to_string(),
                    password: Some("password".to_string()),
                },
            ),
            Err(UpsertSiteError::CodeRequired)
        );

        assert_eq!(
            upsert_site(
                &context,
                UpsertSite {
                    id: 1,
                    code: Some("".to_string()),
                    name: "Site A".to_string(),
                    password: Some("password".to_string()),
                },
            ),
            Err(UpsertSiteError::CodeRequired)
        );

        // Whitespace-only code
        assert_eq!(
            upsert_site(
                &context,
                UpsertSite {
                    id: 1,
                    code: Some("  ".to_string()),
                    name: "Site A".to_string(),
                    password: Some("password".to_string()),
                },
            ),
            Err(UpsertSiteError::CodeRequired)
        );

        assert_eq!(
            upsert_site(
                &context,
                UpsertSite {
                    id: 1,
                    code: Some("code1".to_string()),
                    name: "".to_string(),
                    password: Some("password".to_string()),
                },
            ),
            Err(UpsertSiteError::NameRequired)
        );

        assert_eq!(
            upsert_site(
                &context,
                UpsertSite {
                    id: 1,
                    code: Some("code1".to_string()),
                    name: "  ".to_string(),
                    password: Some("password".to_string()),
                },
            ),
            Err(UpsertSiteError::NameRequired)
        );

        assert_eq!(
            upsert_site(
                &context,
                UpsertSite {
                    id: 1,
                    code: Some("code1".to_string()),
                    name: "Site A".to_string(),
                    password: None,
                },
            ),
            Err(UpsertSiteError::PasswordRequired)
        );

        assert_eq!(
            upsert_site(
                &context,
                UpsertSite {
                    id: 1,
                    code: Some("code1".to_string()),
                    name: "Site A".to_string(),
                    password: Some("".to_string()),
                },
            ),
            Err(UpsertSiteError::PasswordRequired)
        );
    }

    #[actix_rt::test]
    async fn upsert_site_insert_success() {
        let (_, _, connection_manager, _) =
            setup_all("upsert_site_insert_success", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider.basic_context().unwrap();

        upsert_site(
            &context,
            UpsertSite {
                id: 1,
                code: Some("code1".to_string()),
                name: "Site A".to_string(),
                password: Some("password".to_string()),
            },
        )
        .unwrap();

        let connection = connection_manager.connection().unwrap();
        let repo = SiteRowRepository::new(&connection);
        let site = repo.find_one_by_id(1).unwrap().unwrap();
        assert_eq!(site.code, "code1");
        assert_eq!(site.name, "Site A");
    }

    #[actix_rt::test]
    async fn upsert_site_update_success() {
        let (_, _, connection_manager, _) =
            setup_all("upsert_site_update_success", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider.basic_context().unwrap();

        upsert_site(
            &context,
            UpsertSite {
                id: 1,
                code: Some("code1".to_string()),
                name: "Site A".to_string(),
                password: Some("password".to_string()),
            },
        )
        .unwrap();

        let result = upsert_site(
            &context,
            UpsertSite {
                id: 1,
                code: None,
                name: "Site A Updated".to_string(),
                password: None,
            },
        )
        .unwrap();

        assert_eq!(result.name, "Site A Updated");
        assert_eq!(result.code, "code1");

        upsert_site(
            &context,
            UpsertSite {
                id: 1,
                code: Some("new_code".to_string()),
                name: "Site A Updated".to_string(),
                password: None,
            },
        )
        .unwrap();

        let connection = connection_manager.connection().unwrap();
        let repo = SiteRowRepository::new(&connection);
        let site = repo.find_one_by_id(1).unwrap().unwrap();
        assert_eq!(site.code, "new_code");
        assert_eq!(site.name, "Site A Updated");
    }

    #[actix_rt::test]
    async fn upsert_site_preserves_token() {
        let (_, _, connection_manager, _) =
            setup_all("upsert_site_preserves_token", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider.basic_context().unwrap();

        upsert_site(
            &context,
            UpsertSite {
                id: 1,
                code: Some("code1".to_string()),
                name: "Site A".to_string(),
                password: Some("password".to_string()),
            },
        )
        .unwrap();

        let connection = connection_manager.connection().unwrap();
        let repo = SiteRowRepository::new(&connection);
        let mut site = repo.find_one_by_id(1).unwrap().unwrap();
        site.token = Some("existing_token".to_string());
        repo.upsert(&site).unwrap();

        upsert_site(
            &context,
            UpsertSite {
                id: 1,
                code: None,
                name: "Site A Renamed".to_string(),
                password: None,
            },
        )
        .unwrap();

        let site = repo.find_one_by_id(1).unwrap().unwrap();
        assert_eq!(site.token.as_deref(), Some("existing_token"));
    }
}
