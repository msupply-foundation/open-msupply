use crate::service_provider::ServiceContext;
use bcrypt::{hash, DEFAULT_COST};
use repository::{RepositoryError, SiteRow, SiteRowRepository};

#[derive(PartialEq, Debug)]
pub enum UpsertSiteError {
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
