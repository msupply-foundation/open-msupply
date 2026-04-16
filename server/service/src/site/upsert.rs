use crate::service_provider::ServiceContext;
use repository::{RepositoryError, SiteRow, SiteRowRepository};

pub struct UpsertSite {
    pub id: i32,
    pub name: String,
    pub hashed_password: String,
    // Can only be cleared in frontend. The hardware_id is set when a device
    // connects to a site.
    pub clear_hardware_id: bool,
}

pub fn upsert_site(ctx: &ServiceContext, input: UpsertSite) -> Result<SiteRow, RepositoryError> {
    let repo = SiteRowRepository::new(&ctx.connection);

    let existing_hardware_id = repo.find_one_by_id(input.id)?.and_then(|r| r.hardware_id);

    let row = generate(input, existing_hardware_id);
    repo.upsert(&row)?;
    Ok(row)
}

fn generate(
    UpsertSite {
        id,
        name,
        hashed_password,
        clear_hardware_id,
    }: UpsertSite,
    existing_hardware_id: Option<String>,
) -> SiteRow {
    SiteRow {
        id,
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
