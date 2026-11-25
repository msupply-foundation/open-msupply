//! Which reports a store sees on the Reports page without pressing its
//! category's "Show more" (#2033).
//!
//! An admin can give a report store tags. A report with no tags is displayed
//! for every store; a report with tags is displayed only for stores whose name
//! has at least one of them. Every other store still has the report and can run
//! it: it's only moved behind "Show more". Active/inactive is separate
//! and unchanged: an inactive report isn't listed at all.
//!
//! This is the one place the decision is made, so a later way of choosing
//! (facility types, or a plugin deciding) replaces this module rather than the
//! callers.

use std::collections::HashSet;

use repository::{
    EqualFilter, NameTagFilter, NameTagRepository, NameTagRowRepository, PreferenceRowRepository,
    RepositoryError, StorageConnection,
};

use crate::preference::{
    Preference, ReportStoreTags, ReportStoreTagsValue, UpsertPreferenceError,
    upsert_helpers::global_preference_id,
};

use super::report_service::UpdateReportError;

pub struct ReportDisplay {
    tags_by_code: ReportStoreTagsValue,
    store_tag_ids: HashSet<String>,
}

impl ReportDisplay {
    /// The report store tags, and the tags of `store_id`'s name.
    pub fn load(connection: &StorageConnection, store_id: &str) -> Result<Self, RepositoryError> {
        let tags_by_code = ReportStoreTags
            .load(connection, None)
            .map_err(|e| e.into_repository_error())?;

        // Skip the tag lookup when no report has tags, which is every site
        // until an admin sets some.
        let store_tag_ids = if tags_by_code.values().all(Vec::is_empty) {
            HashSet::new()
        } else {
            NameTagRepository::new(connection)
                .query(Some(
                    NameTagFilter::new().store_id(EqualFilter::equal_to(store_id.to_string())),
                ))?
                .into_iter()
                .map(|tag| tag.id)
                .collect()
        };

        Ok(Self {
            tags_by_code,
            store_tag_ids,
        })
    }

    /// The store tags a report is displayed for. Empty means every store.
    pub fn report_store_tag_ids(&self, report_code: &str) -> Vec<String> {
        self.tags_by_code
            .get(report_code)
            .cloned()
            .unwrap_or_default()
    }

    /// Whether the store sees this report without pressing "Show more".
    pub fn is_displayed(&self, report_code: &str) -> bool {
        match self.tags_by_code.get(report_code) {
            None => true,
            Some(tags) if tags.is_empty() => true,
            Some(tags) => tags.iter().any(|tag| self.store_tag_ids.contains(tag)),
        }
    }
}

/// Set the store tags a report is displayed for, for every version of it.
/// An empty list displays it for every store again. Returns the tags as saved:
/// duplicates removed, in the order given.
pub(crate) fn set_report_store_tags(
    connection: &StorageConnection,
    report_code: &str,
    tag_ids: Vec<String>,
) -> Result<Vec<String>, UpdateReportError> {
    let mut seen = HashSet::new();
    let tag_ids: Vec<String> = tag_ids
        .into_iter()
        .filter(|id| seen.insert(id.clone()))
        .collect();

    // Every report's tags live in one preference row, so this is a
    // read-modify-write. Hold the lock until the transaction ends, or two
    // admins saving different reports at once could each write back the map
    // they read and lose the other's change (Postgres; SQLite already runs one
    // writer at a time).
    PreferenceRowRepository::new(connection)
        .lock_for_update(&global_preference_id(&ReportStoreTags.key_str()))
        .map_err(UpdateReportError::RepositoryError)?;

    let mut tags_by_code = ReportStoreTags
        .load(connection, None)
        .map_err(|e| UpdateReportError::RepositoryError(e.into_repository_error()))?;
    let stored = tags_by_code.get(report_code).cloned().unwrap_or_default();

    // Unchanged (in any order): nothing to write. Checked before the tags are
    // validated, so a save that only changes the active state never fails on a
    // stored tag that has since gone.
    if same_tags(&stored, &tag_ids) {
        return Ok(stored);
    }

    // Only tags this save adds are checked; one already stored stays valid
    // here even if its row has gone, so it can still be removed.
    let tag_repo = NameTagRowRepository::new(connection);
    for tag_id in tag_ids.iter().filter(|id| !stored.contains(id)) {
        if tag_repo
            .find_one_by_id(tag_id)
            .map_err(UpdateReportError::RepositoryError)?
            .is_none()
        {
            return Err(UpdateReportError::StoreTagNotFound(tag_id.clone()));
        }
    }

    if tag_ids.is_empty() {
        // No entry rather than an empty one, so the preference only lists
        // reports someone has limited.
        tags_by_code.remove(report_code);
    } else {
        tags_by_code.insert(report_code.to_string(), tag_ids.clone());
    }

    ReportStoreTags
        .upsert(connection, tags_by_code, None)
        .map_err(|e| match e {
            UpsertPreferenceError::NotACentralServer => UpdateReportError::NotACentralServer,
            UpsertPreferenceError::DatabaseError(e) => UpdateReportError::RepositoryError(e),
            other => UpdateReportError::RepositoryError(RepositoryError::as_db_error(
                "failed to save report store tags",
                other,
            )),
        })?;

    Ok(tag_ids)
}

fn same_tags(a: &[String], b: &[String]) -> bool {
    a.len() == b.len() && a.iter().all(|id| b.contains(id))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        report::report_service::UpdateReport, service_provider::ServiceProvider,
        sync::test_util_set_is_central_server,
    };
    use repository::{
        NameTagJoinRepository, NameTagJoinRow,
        mock::{
            MockDataInserts, mock_name_tag_1, mock_name_tag_2, mock_name_tag_3, mock_report_a,
            mock_report_b, mock_store_a, mock_store_b,
        },
        test_db::setup_all,
    };

    // mock_report_a and mock_report_b are two versions of the same report code.
    fn update(id: &str, tags: Option<Vec<String>>) -> UpdateReport {
        UpdateReport {
            id: id.to_string(),
            is_active: true,
            store_tag_ids: tags,
        }
    }

    fn tag_store(connection: &StorageConnection, store_name_id: &str, tag_id: &str) {
        NameTagJoinRepository::new(connection)
            .upsert_one(&NameTagJoinRow {
                id: format!("{store_name_id}_{tag_id}"),
                name_id: store_name_id.to_string(),
                name_tag_id: tag_id.to_string(),
            })
            .unwrap();
    }

    #[actix_rt::test]
    async fn report_store_tags_decide_which_stores_display_a_report() {
        let (_, connection, connection_manager, _) =
            setup_all("report_store_tags_display", MockDataInserts::all()).await;
        test_util_set_is_central_server(true);
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        let service = &service_provider.report_service;
        let code = mock_report_a().code;
        let store_a = mock_store_a();
        let store_b = mock_store_b();
        tag_store(&connection, &store_a.name_id, &mock_name_tag_1().id);
        tag_store(&connection, &store_b.name_id, &mock_name_tag_2().id);

        // A report nobody has set tags on is displayed for every store.
        for store in [&store_a, &store_b] {
            let display = ReportDisplay::load(&connection, &store.id).unwrap();
            assert!(display.is_displayed(&code));
            assert!(display.report_store_tag_ids(&code).is_empty());
        }

        // Tagged: displayed only for stores with the tag. The other store
        // still has the report, behind Show more.
        let updated = service
            .update_report(
                &ctx,
                update(&mock_report_a().id, Some(vec![mock_name_tag_1().id])),
            )
            .unwrap();
        assert_eq!(updated.store_tag_ids, vec![mock_name_tag_1().id]);
        assert!(
            ReportDisplay::load(&connection, &store_a.id)
                .unwrap()
                .is_displayed(&code)
        );
        assert!(
            !ReportDisplay::load(&connection, &store_b.id)
                .unwrap()
                .is_displayed(&code)
        );

        // Several tags: displayed for a store with any one of them.
        service
            .update_report(
                &ctx,
                update(
                    &mock_report_a().id,
                    Some(vec![mock_name_tag_1().id, mock_name_tag_2().id]),
                ),
            )
            .unwrap();
        for store in [&store_a, &store_b] {
            assert!(
                ReportDisplay::load(&connection, &store.id)
                    .unwrap()
                    .is_displayed(&code)
            );
        }

        // A tag store A lacks hides it there again...
        service
            .update_report(
                &ctx,
                update(&mock_report_a().id, Some(vec![mock_name_tag_3().id])),
            )
            .unwrap();
        assert!(
            !ReportDisplay::load(&connection, &store_a.id)
                .unwrap()
                .is_displayed(&code)
        );
        // ...and no tags at all shows it to every store (OMS-REG-MNG-06.38).
        let cleared = service
            .update_report(&ctx, update(&mock_report_a().id, Some(vec![])))
            .unwrap();
        assert!(cleared.store_tag_ids.is_empty());
        assert!(
            ReportDisplay::load(&connection, &store_a.id)
                .unwrap()
                .is_displayed(&code)
        );
        assert_eq!(
            ReportStoreTags.load(&connection, None).unwrap(),
            ReportStoreTagsValue::new(),
            "an emptied report leaves no entry behind"
        );
    }

    #[actix_rt::test]
    async fn report_store_tags_apply_to_every_version_of_a_report() {
        let (_, connection, connection_manager, _) =
            setup_all("report_store_tags_every_version", MockDataInserts::all()).await;
        test_util_set_is_central_server(true);
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        let service = &service_provider.report_service;
        assert_eq!(mock_report_a().code, mock_report_b().code);

        // Set through one version...
        service
            .update_report(
                &ctx,
                update(&mock_report_a().id, Some(vec![mock_name_tag_1().id])),
            )
            .unwrap();

        // ...the other version has them too, and leaving the tags out of an
        // update (an active-only change) keeps them.
        let updated = service
            .update_report(
                &ctx,
                UpdateReport {
                    id: mock_report_b().id,
                    is_active: false,
                    store_tag_ids: None,
                },
            )
            .unwrap();
        assert!(!updated.row.is_active);
        assert_eq!(updated.store_tag_ids, vec![mock_name_tag_1().id]);

        let display = ReportDisplay::load(&connection, &mock_store_a().id).unwrap();
        assert_eq!(
            display.report_store_tag_ids(&mock_report_b().code),
            vec![mock_name_tag_1().id]
        );
    }

    #[actix_rt::test]
    async fn report_store_tags_are_checked_and_deduplicated() {
        let (_, connection, connection_manager, _) =
            setup_all("report_store_tags_checked", MockDataInserts::all()).await;
        test_util_set_is_central_server(true);
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        let service = &service_provider.report_service;

        // A tag that doesn't exist is refused, and nothing is saved, including
        // the active change in the same update.
        let result = service.update_report(
            &ctx,
            UpdateReport {
                id: mock_report_a().id,
                is_active: false,
                store_tag_ids: Some(vec!["no_such_tag".to_string()]),
            },
        );
        assert!(matches!(
            result,
            Err(UpdateReportError::StoreTagNotFound(id)) if id == "no_such_tag"
        ));
        assert_eq!(
            ReportStoreTags.load(&connection, None).unwrap(),
            ReportStoreTagsValue::new()
        );
        let row = repository::ReportRowRepository::new(&connection)
            .find_one_by_id(&mock_report_a().id)
            .unwrap()
            .unwrap();
        assert_eq!(row.is_active, mock_report_a().is_active);

        // A tag given twice is saved once.
        let updated = service
            .update_report(
                &ctx,
                update(
                    &mock_report_a().id,
                    Some(vec![
                        mock_name_tag_2().id,
                        mock_name_tag_1().id,
                        mock_name_tag_2().id,
                    ]),
                ),
            )
            .unwrap();
        assert_eq!(
            updated.store_tag_ids,
            vec![mock_name_tag_2().id, mock_name_tag_1().id]
        );

        // A stored tag whose row has gone doesn't block a save that leaves the
        // tags as they are (in any order) — e.g. one that only changes the
        // active state — and can still be removed.
        let mut stored = ReportStoreTags.load(&connection, None).unwrap();
        stored.insert(
            mock_report_a().code,
            vec![mock_name_tag_1().id, "gone_tag".to_string()],
        );
        ReportStoreTags.upsert(&connection, stored, None).unwrap();
        let updated = service
            .update_report(
                &ctx,
                UpdateReport {
                    id: mock_report_a().id,
                    is_active: false,
                    store_tag_ids: Some(vec!["gone_tag".to_string(), mock_name_tag_1().id]),
                },
            )
            .unwrap();
        assert!(!updated.row.is_active);
        let updated = service
            .update_report(
                &ctx,
                update(&mock_report_a().id, Some(vec![mock_name_tag_1().id])),
            )
            .unwrap();
        assert_eq!(updated.store_tag_ids, vec![mock_name_tag_1().id]);
    }

    // OMS-REG-MNG-06.39
    #[actix_rt::test]
    async fn report_store_tags_are_set_on_central_only() {
        let (_, _, connection_manager, _) =
            setup_all("report_store_tags_central_only", MockDataInserts::all()).await;
        test_util_set_is_central_server(false);
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();

        let result = service_provider.report_service.update_report(
            &ctx,
            update(&mock_report_a().id, Some(vec![mock_name_tag_1().id])),
        );
        assert!(matches!(result, Err(UpdateReportError::NotACentralServer)));
    }
}
