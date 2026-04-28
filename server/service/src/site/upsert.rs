use crate::service_provider::ServiceContext;
use bcrypt::{hash, DEFAULT_COST};
use repository::{RepositoryError, SiteRow, SiteRowRepository};

#[derive(PartialEq, Debug)]
pub enum UpsertSiteError {
    CodeMustBeProvided,
    NameNotProvided,
    PasswordRequired,
    DatabaseError(RepositoryError),
}

pub struct UpsertSite {
    pub id: i32,
    pub code: Option<String>,
    pub name: String,
    pub password: Option<String>,
    // Can only be cleared in frontend. The hardware_id is set when a device
    // connects to a site.
    pub clear_hardware_id: bool,
}

pub fn upsert_site(ctx: &ServiceContext, input: UpsertSite) -> Result<SiteRow, UpsertSiteError> {
    ctx.connection
        .transaction_sync(|connection| {
            let repo = SiteRowRepository::new(connection);
            let existing = repo.find_one_by_id(input.id)?;

            validate(&input, &existing)?;
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

fn validate(input: &UpsertSite, existing: &Option<SiteRow>) -> Result<(), UpsertSiteError> {
    match (&input.code, existing) {
        (Some(code), _) if code.trim().is_empty() => {
            return Err(UpsertSiteError::CodeMustBeProvided)
        }
        (None, None) => return Err(UpsertSiteError::CodeMustBeProvided),
        _ => {}
    }

    if input.name.trim().is_empty() {
        return Err(UpsertSiteError::NameNotProvided);
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
        clear_hardware_id,
        password,
    }: UpsertSite,
    existing_site: Option<SiteRow>,
) -> SiteRow {
    let existing_og_id = existing_site.as_ref().and_then(|s| s.og_id.clone());
    let existing_code = existing_site.as_ref().map(|s| s.code.clone());
    let existing_hardware_id = existing_site.as_ref().and_then(|s| s.hardware_id.clone());

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
        name,
        hashed_password,
        hardware_id: if clear_hardware_id {
            None
        } else {
            existing_hardware_id
        },
        token: None,
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
                    clear_hardware_id: false,
                },
            ),
            Err(UpsertSiteError::CodeMustBeProvided)
        );

        assert_eq!(
            upsert_site(
                &context,
                UpsertSite {
                    id: 1,
                    code: Some("".to_string()),
                    name: "Site A".to_string(),
                    password: Some("password".to_string()),
                    clear_hardware_id: false,
                },
            ),
            Err(UpsertSiteError::CodeMustBeProvided)
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
                    clear_hardware_id: false,
                },
            ),
            Err(UpsertSiteError::CodeMustBeProvided)
        );

        assert_eq!(
            upsert_site(
                &context,
                UpsertSite {
                    id: 1,
                    code: Some("code1".to_string()),
                    name: "".to_string(),
                    password: Some("password".to_string()),
                    clear_hardware_id: false,
                },
            ),
            Err(UpsertSiteError::NameNotProvided)
        );

        assert_eq!(
            upsert_site(
                &context,
                UpsertSite {
                    id: 1,
                    code: Some("code1".to_string()),
                    name: "  ".to_string(),
                    password: Some("password".to_string()),
                    clear_hardware_id: false,
                },
            ),
            Err(UpsertSiteError::NameNotProvided)
        );

        assert_eq!(
            upsert_site(
                &context,
                UpsertSite {
                    id: 1,
                    code: Some("code1".to_string()),
                    name: "Site A".to_string(),
                    password: None,
                    clear_hardware_id: false,
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
                    clear_hardware_id: false,
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
                clear_hardware_id: false,
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
                clear_hardware_id: false,
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
                clear_hardware_id: false,
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
                clear_hardware_id: false,
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
    async fn upsert_site_clear_hardware_id() {
        let (_, _, connection_manager, _) =
            setup_all("upsert_site_clear_hardware_id", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider.basic_context().unwrap();

        upsert_site(
            &context,
            UpsertSite {
                id: 1,
                code: Some("code1".to_string()),
                name: "Site A".to_string(),
                password: Some("password".to_string()),
                clear_hardware_id: false,
            },
        )
        .unwrap();

        let connection = connection_manager.connection().unwrap();
        let repo = SiteRowRepository::new(&connection);
        let mut site = repo.find_one_by_id(1).unwrap().unwrap();
        site.hardware_id = Some("hw-123".to_string());
        repo.upsert(&site).unwrap();

        upsert_site(
            &context,
            UpsertSite {
                id: 1,
                code: None,
                name: "Site A".to_string(),
                password: None,
                clear_hardware_id: true,
            },
        )
        .unwrap();

        let site = repo.find_one_by_id(1).unwrap().unwrap();
        assert_eq!(site.hardware_id, None);
    }
}
