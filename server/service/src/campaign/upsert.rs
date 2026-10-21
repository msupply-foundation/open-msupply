use chrono::NaiveDate;
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
    InvalidDates,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(Default, Clone)]
pub struct UpsertCampaign {
    pub id: String,
    pub name: String,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
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
        start_date,
        end_date,
        kind,
    }: UpsertCampaign,
) -> CampaignRow {
    let stored_kind = existing.map(|campaign| campaign.kind);

    CampaignRow {
        id,
        name,
        start_date,
        end_date,
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

    // Validate dates
    if let (Some(start_date), Some(end_date)) = (input.start_date, input.end_date)
        && start_date > end_date
    {
        return Err(UpsertCampaignError::InvalidDates);
    }

    Ok(())
}

#[cfg(test)]
mod test {
    use repository::{mock::MockDataInserts, test_db::setup_all};

    use super::*;
    use crate::service_provider::ServiceProvider;

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
                        kind,
                        ..Default::default()
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
