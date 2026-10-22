use repository::{
    EqualFilter, RepositoryError, StorageConnection, StringFilter,
    campaign::campaign::{Campaign, CampaignFilter, CampaignRepository},
    campaign::campaign_row::{CampaignKind, CampaignRow, CampaignRowRepository},
};

use crate::service_provider::ServiceContext;

#[derive(PartialEq, Debug)]
pub enum UpsertCampaignError {
    CampaignDoesNotExist,
    DuplicateName,
    DuplicateCode,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(Default, Clone)]
pub struct UpsertCampaign {
    pub id: String,
    pub name: String,
    /// For systems outside open mSupply to match on; blank when nothing needs one.
    /// None leaves a stored code alone (a new campaign has none), so a caller that
    /// doesn't know about codes can't clear one by saving a name.
    pub code: Option<String>,
    /// None leaves a stored kind alone; a new campaign takes the default.
    pub kind: Option<CampaignKind>,
}

pub fn upsert_campaign(
    ctx: &ServiceContext,
    input: UpsertCampaign,
) -> Result<Campaign, UpsertCampaignError> {
    let campaign = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let repo = CampaignRowRepository::new(connection);
            let existing = repo.find_one_by_id(&input.id)?;
            let new_campaign = generate(existing, input.clone());

            repo.upsert_one(&new_campaign)?;

            CampaignRepository::new(connection)
                .query_one(
                    CampaignFilter::new().id(EqualFilter::equal_to(new_campaign.id.to_string())),
                )?
                .ok_or(UpsertCampaignError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(campaign)
}

impl From<RepositoryError> for UpsertCampaignError {
    fn from(error: RepositoryError) -> Self {
        UpsertCampaignError::DatabaseError(error)
    }
}

pub fn generate(
    existing: Option<CampaignRow>,
    UpsertCampaign {
        id,
        name,
        code,
        kind,
    }: UpsertCampaign,
) -> CampaignRow {
    let (stored_kind, stored_code) = existing
        .map(|campaign| (Some(campaign.kind), campaign.code))
        .unwrap_or_default();

    CampaignRow {
        id,
        name,
        code: code.map_or(stored_code, |code| code.trim().to_string()),
        deleted_datetime: None,
        kind: resolve_kind(stored_kind, kind),
    }
}

/// The kind the save lands on. The register's kind drives whether a line's stock counts
/// as routine, so an upsert only ever CHANGES it when it was asked to — every other
/// outcome keeps what is stored:
///
///  - An omitted kind leaves the stored one alone (a new campaign takes the default),
///    so a caller that doesn't know about kinds can't demote a Routine by saving a name.
///  - `Other` survives a kind it cannot be told apart from. The wire reports `Other` as
///    `Campaign` ([`CampaignKindNode`]), so a client that read such a row and echoed it
///    back is saying "unchanged", not "demote this to a plain campaign" — only an
///    explicit `Routine` moves it.
fn resolve_kind(stored: Option<CampaignKind>, input: Option<CampaignKind>) -> CampaignKind {
    match (stored, input) {
        (stored, None) => stored.unwrap_or_default(),
        (Some(stored @ CampaignKind::Other(_)), Some(CampaignKind::Campaign)) => stored,
        (_, Some(input)) => input,
    }
}

fn validate(
    connection: &StorageConnection,
    input: &UpsertCampaign,
) -> Result<(), UpsertCampaignError> {
    // Check for duplicate name
    let campaigns_with_duplicate_name = CampaignRepository::new(connection).query_by_filter(
        CampaignFilter::new()
            .name(StringFilter::equal_to(input.name.trim()))
            .id(EqualFilter::not_equal_to(input.id.to_string())),
    )?;

    if !campaigns_with_duplicate_name.is_empty() {
        return Err(UpsertCampaignError::DuplicateName);
    }

    // Codes are unique when set; any number of campaigns can have none
    if let Some(code) = input.code.as_deref().map(str::trim)
        && !code.is_empty()
    {
        let campaigns_with_duplicate_code = CampaignRepository::new(connection)
            .query_by_filter(
                CampaignFilter::new()
                    .code(StringFilter::equal_to(code))
                    .id(EqualFilter::not_equal_to(input.id.to_string())),
            )?;

        if !campaigns_with_duplicate_code.is_empty() {
            return Err(UpsertCampaignError::DuplicateCode);
        }
    }

    Ok(())
}

#[cfg(test)]
mod test {
    use repository::{mock::MockDataInserts, test_db::setup_all};

    use super::*;
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn upsert_campaign_code() {
        let (_, _, connection_manager, _) =
            setup_all("upsert_campaign_code", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        let service = &service_provider.campaign_service;

        let save = |id: &str, name: &str, code: Option<&str>| {
            service.upsert_campaign(
                &ctx,
                UpsertCampaign {
                    id: id.to_string(),
                    name: name.to_string(),
                    code: code.map(str::to_string),
                    kind: None,
                },
            )
        };

        // A campaign needs no code, and many can go without one
        assert_eq!(save("a", "A", None).unwrap().code, "");
        assert_eq!(save("b", "B", Some("  ")).unwrap().code, "");

        // The code is stored trimmed, separate from the name
        assert_eq!(
            save("ri", "Routine immunisation", Some(" RI ")).unwrap().code,
            "RI"
        );

        // A save that doesn't mention the code keeps it
        assert_eq!(
            save("ri", "Routine immunisation (renamed)", None)
                .unwrap()
                .code,
            "RI"
        );

        // Another live campaign can't take the same code, whatever its case
        assert_eq!(
            save("other", "Other", Some("ri")),
            Err(UpsertCampaignError::DuplicateCode)
        );

        // Saving a campaign with its own code is fine, and the code can change
        assert!(save("ri", "Routine immunisation", Some("RI")).is_ok());
        assert_eq!(
            save("ri", "Routine immunisation", Some("RI-2"))
                .unwrap()
                .code,
            "RI-2"
        );

        // An explicit blank clears it
        assert_eq!(save("b", "B", Some("")).unwrap().code, "");

        // A deleted campaign frees its code
        service
            .delete_campaign(
                &ctx,
                crate::campaign::DeleteCampaign {
                    id: "ri".to_string(),
                },
            )
            .unwrap();
        assert!(save("other", "Other", Some("RI-2")).is_ok());
    }

    #[actix_rt::test]
    async fn upsert_campaign_kind() {
        let (_, connection, connection_manager, _) =
            setup_all("upsert_campaign_kind", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        let service = &service_provider.campaign_service;

        let save = |id: &str, name: &str, kind| {
            service
                .upsert_campaign(
                    &ctx,
                    UpsertCampaign {
                        id: id.to_string(),
                        name: name.to_string(),
                        code: None,
                        kind,
                    },
                )
                .unwrap()
                .kind
        };
        let stored = |id: &str| {
            CampaignRowRepository::new(&connection)
                .find_one_by_id(id)
                .unwrap()
                .unwrap()
                .kind
        };

        // A new campaign with no kind asked for is a plain campaign
        assert_eq!(save("new", "New", None), CampaignKind::Campaign);
        assert_eq!(
            save("routine", "Routine", Some(CampaignKind::Routine)),
            CampaignKind::Routine
        );

        // An omitted kind leaves the stored one alone: renaming the routine entry
        // through a caller that knows nothing of kinds must not demote it (issue 595)
        assert_eq!(
            save("routine", "Routine immunisation", None),
            CampaignKind::Routine
        );
        assert_eq!(stored("routine"), CampaignKind::Routine);

        // Asked for explicitly, a kind change is an ordinary edit, both ways
        assert_eq!(
            save(
                "routine",
                "Routine immunisation",
                Some(CampaignKind::Campaign)
            ),
            CampaignKind::Campaign
        );
        assert_eq!(
            save(
                "routine",
                "Routine immunisation",
                Some(CampaignKind::Routine)
            ),
            CampaignKind::Routine
        );

        // A kind the wire cannot express survives the kind it reports AS — a client
        // echoing back the CAMPAIGN it read is saying "unchanged", not "demote"
        CampaignRowRepository::new(&connection)
            .upsert_one(&CampaignRow {
                id: "outreach".to_string(),
                name: "Outreach".to_string(),
                kind: CampaignKind::Other("outreach".to_string()),
                ..Default::default()
            })
            .unwrap();
        save("outreach", "Outreach 2026", Some(CampaignKind::Campaign));
        assert_eq!(
            stored("outreach"),
            CampaignKind::Other("outreach".to_string())
        );
        save("outreach", "Outreach 2026", None);
        assert_eq!(
            stored("outreach"),
            CampaignKind::Other("outreach".to_string())
        );

        // Only an explicit Routine moves it, since that is a kind the wire CAN say
        save("outreach", "Outreach 2026", Some(CampaignKind::Routine));
        assert_eq!(stored("outreach"), CampaignKind::Routine);
    }
}
