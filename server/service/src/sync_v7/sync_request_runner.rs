// Runs persisted sync_request rows after the main sync each tick.
//
// One group per tick. Group formation:
//   - If any active rows have a reference_id set: rows sharing the first
//     such reference_id are the group (the in-flight retry).
//   - Otherwise: every active row goes into one fresh group, which is
//     assigned a new uuid reference_id before running.
//
// Filters within the group are OR'd per direction. The dynamic cursor ids
// are derived from the group reference_id: "pull_<reference_id>" and
// "push_<reference_id>" — so they're stable across retries and don't need
// to be persisted on the row.
//
// Termination: the group is marked finished when its SyncRequest returns
// Ok. On error all members keep their (now-persisted) reference_id so the
// next tick re-picks them as the in-flight group and retries.

use repository::{
    syncv7::SyncError, ChangelogCondition, FilterBuilder, SyncRequestCondition,
    SyncRequestRepository, SyncRequestRow,
};

use crate::{
    cursor_controller::CursorType,
    service_provider::{ServiceContext, ServiceProvider},
    sync::settings::SyncSettings,
    sync_v7::{
        sync::sync_v7,
        sync_request::{SyncRequest, SyncRequestStep},
    },
};

/// Run the next pending sync_request group (one group per call). No-op if
/// no active requests exist.
pub async fn run_pending_sync_requests(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    settings: &SyncSettings,
) -> Result<(), SyncError> {
    let repo = SyncRequestRepository::new(&ctx.connection);
    let active = repo.query(SyncRequestCondition::FinishedDatetime::is_null())?;

    let Some((reference_id, members)) = form_group(active) else {
        return Ok(());
    };

    // Persist the (possibly newly-assigned) reference_id before running, so a
    // crash mid-run leaves the rows recoverable on the next tick.
    for member in &members {
        repo.upsert_one(member)?;
    }

    let pull_filters = collect_filters(&members, |m| &m.pull_filter);
    let push_filters = collect_filters(&members, |m| &m.push_filter);

    let request = SyncRequest {
        pull: pull_filters.map(|filter| SyncRequestStep {
            filter,
            cursor_type: CursorType::Dynamic(format!("pull_{reference_id}")),
        }),
        push: push_filters.map(|filter| SyncRequestStep {
            filter,
            cursor_type: CursorType::Dynamic(format!("push_{reference_id}")),
        }),
        reference_id: Some(reference_id),
        is_initialising: false,
        run_post_sync_triggers: false,
    };

    sync_v7(service_provider, ctx, settings.clone(), request).await?;

    let ids: Vec<String> = members.iter().map(|m| m.id.clone()).collect();
    repo.mark_finished_many(&ids, chrono::Utc::now().naive_utc())?;

    Ok(())
}

/// Returns (group_reference_id, members_with_reference_id_stamped). Members
/// have their `reference_id` field set to the group reference_id so an
/// upsert_one persists it. Returns None if no active rows.
fn form_group(active: Vec<SyncRequestRow>) -> Option<(String, Vec<SyncRequestRow>)> {
    if active.is_empty() {
        return None;
    }

    // If any row has a reference_id, the group is just the rows sharing the
    // first such value. Other rows wait for the next tick.
    let first_reference_id = active.iter().find_map(|p| p.reference_id.clone());

    let mut members: Vec<SyncRequestRow> = match &first_reference_id {
        Some(r) => active
            .into_iter()
            .filter(|p| p.reference_id.as_deref() == Some(r.as_str()))
            .collect(),
        None => active,
    };

    let reference_id = first_reference_id.unwrap_or_else(util::uuid::uuid);

    for m in &mut members {
        m.reference_id = Some(reference_id.clone());
    }

    Some((reference_id, members))
}

/// OR all set filters from a single direction across the group, or None if
/// no member configures this direction.
fn collect_filters<F>(members: &[SyncRequestRow], side: F) -> Option<ChangelogCondition::Inner>
where
    F: Fn(&SyncRequestRow) -> &Option<repository::SyncRequestFilter>,
{
    let mut filters: Vec<ChangelogCondition::Inner> = members
        .iter()
        .filter_map(|m| side(m).as_ref().map(|f| f.0.clone()))
        .collect();

    match filters.len() {
        0 => None,
        1 => Some(filters.pop().unwrap()),
        _ => Some(ChangelogCondition::Or(filters)),
    }
}
