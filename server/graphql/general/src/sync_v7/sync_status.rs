use async_graphql::*;
use chrono::{DateTime, NaiveDateTime, Utc};
use service::{
    sync::sync_status::status::{SyncStatus, SyncStatusWithProgress},
    sync_v7::sync_status::status::FullSyncStatusV7,
};

use crate::queries::sync_status::SyncStatusNode;

use super::sync_api_error::SyncErrorV7Node;

pub struct SyncStatusV7Node {
    started: NaiveDateTime,
    finished: Option<NaiveDateTime>,
}

#[Object]
impl SyncStatusV7Node {
    async fn started(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.started, Utc)
    }

    async fn finished(&self) -> Option<DateTime<Utc>> {
        self.finished
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
}

pub struct SyncStatusWithProgressV7Node {
    started: NaiveDateTime,
    finished: Option<NaiveDateTime>,
    total: Option<u32>,
    done: Option<u32>,
}

#[Object]
impl SyncStatusWithProgressV7Node {
    async fn started(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.started, Utc)
    }

    async fn finished(&self) -> Option<DateTime<Utc>> {
        self.finished
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    async fn total(&self) -> &Option<u32> {
        &self.total
    }

    async fn done(&self) -> &Option<u32> {
        &self.done
    }
}

#[derive(SimpleObject)]
pub struct FullSyncStatusV7Node {
    is_syncing: bool,
    error: Option<SyncErrorV7Node>,
    summary: SyncStatusV7Node,
    push: Option<SyncStatusWithProgressV7Node>,
    pull: Option<SyncStatusWithProgressV7Node>,
    waiting_for_integration: Option<SyncStatusV7Node>,
    integration: Option<SyncStatusWithProgressV7Node>,
    last_successful_sync: Option<SyncStatusNode>,
    warning_threshold: i64,
    error_threshold: i64,
}

impl FullSyncStatusV7Node {
    pub fn from_sync_status(
        status: FullSyncStatusV7,
        last_successful_sync: Option<SyncStatus>,
    ) -> Self {
        let to_node = |s: SyncStatus| SyncStatusV7Node {
            started: s.started,
            finished: s.finished,
        };
        let to_progress_node = |s: SyncStatusWithProgress| SyncStatusWithProgressV7Node {
            started: s.started,
            finished: s.finished,
            total: s.total,
            done: s.done,
        };

        FullSyncStatusV7Node {
            is_syncing: status.is_syncing,
            error: status.error.map(SyncErrorV7Node::from_sync_error),
            summary: to_node(status.summary),
            push: status.push.map(&to_progress_node),
            pull: status.pull.map(&to_progress_node),
            waiting_for_integration: status.waiting_for_integration.map(&to_node),
            integration: status.integration.map(to_progress_node),
            last_successful_sync: last_successful_sync.map(SyncStatusNode::from_sync_status),
            warning_threshold: 1,
            error_threshold: 3,
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use chrono::{Duration, NaiveDate};
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test_with_data};
    use repository::{
        mock::{MockData, MockDataInserts},
        syncv7::SyncError,
        SyncLogV7Row,
    };
    use serde_json::json;

    use crate::GeneralQueries;

    #[actix_rt::test]
    async fn graphql_latest_sync_status_v7_empty() {
        let (_, _, _, settings) = setup_graphql_test_with_data(
            GeneralQueries,
            EmptyMutation,
            "graphql_latest_sync_status_v7_empty",
            MockDataInserts::none(),
            MockData::default(),
        )
        .await;

        let query = r#"{
            latestSyncStatus { __typename ... on FullSyncStatusV7Node {
                isSyncing
                summary { started finished }
                error { variant fullError }
                push { started finished total done }
                pull { started finished total done }
                integration { started finished total done }
                waitingForIntegration { started finished }
            } }
        }"#;

        let expected = json!({
            "latestSyncStatus": null
        });
        assert_graphql_query!(&settings, query, &None, expected, None);
    }

    #[actix_rt::test]
    async fn graphql_latest_sync_status_v7_in_progress() {
        let started = NaiveDate::from_ymd_opt(2025, 6, 1)
            .unwrap()
            .and_hms_opt(10, 0, 0)
            .unwrap();

        let (_, _, _, settings) = setup_graphql_test_with_data(
            GeneralQueries,
            EmptyMutation,
            "graphql_latest_sync_status_v7_in_progress",
            MockDataInserts::none(),
            MockData {
                sync_logs_v7: vec![SyncLogV7Row {
                    id: "sync_1".to_string(),
                    started_datetime: started,
                    push_started_datetime: Some(started + Duration::seconds(5)),
                    push_progress_total: Some(10),
                    push_progress_done: Some(3),
                    ..Default::default()
                }],
                ..Default::default()
            },
        )
        .await;

        let query = r#"{
            latestSyncStatus { __typename ... on FullSyncStatusV7Node {
                isSyncing
                summary { started finished }
                error { variant fullError }
                push { started finished total done }
                pull { started finished total done }
            } }
        }"#;

        let expected = json!({
            "latestSyncStatus": {
                "__typename": "FullSyncStatusV7Node",
                "isSyncing": true,
                "summary": {
                    "started": "2025-06-01T10:00:00+00:00",
                    "finished": null,
                },
                "error": null,
                "push": {
                    "started": "2025-06-01T10:00:05+00:00",
                    "finished": null,
                    "total": 10,
                    "done": 3,
                },
                "pull": null,
            }
        });
        assert_graphql_query!(&settings, query, &None, expected, None);
    }

    #[actix_rt::test]
    async fn graphql_latest_sync_status_v7_error() {
        let started = NaiveDate::from_ymd_opt(2025, 6, 1)
            .unwrap()
            .and_hms_opt(10, 0, 0)
            .unwrap();

        let (_, _, _, settings) = setup_graphql_test_with_data(
            GeneralQueries,
            EmptyMutation,
            "graphql_latest_sync_status_v7_error",
            MockDataInserts::none(),
            MockData {
                sync_logs_v7: vec![SyncLogV7Row {
                    id: "sync_1".to_string(),
                    started_datetime: started,
                    error: Some(SyncError::ConnectionError {
                        url: "http://test.com".to_string(),
                        e: "connection refused".to_string(),
                    }),
                    ..Default::default()
                }],
                ..Default::default()
            },
        )
        .await;

        let query = r#"{
            latestSyncStatus { __typename ... on FullSyncStatusV7Node {
                isSyncing
                error { variant fullError }
            } }
        }"#;

        let expected = json!({
            "latestSyncStatus": {
                "__typename": "FullSyncStatusV7Node",
                "isSyncing": false,
                "error": {
                    "variant": "CONNECTION_ERROR",
                    "fullError": "Could not connect to server http://test.com connection refused",
                },
            }
        });
        assert_graphql_query!(&settings, query, &None, expected, None);
    }

    #[actix_rt::test]
    async fn graphql_latest_sync_status_v7_completed() {
        let started = NaiveDate::from_ymd_opt(2025, 6, 1)
            .unwrap()
            .and_hms_opt(10, 0, 0)
            .unwrap();
        let finished = started + Duration::seconds(60);

        let (_, _, _, settings) = setup_graphql_test_with_data(
            GeneralQueries,
            EmptyMutation,
            "graphql_latest_sync_status_v7_completed",
            MockDataInserts::none(),
            MockData {
                sync_logs_v7: vec![SyncLogV7Row {
                    id: "sync_1".to_string(),
                    started_datetime: started,
                    finished_datetime: Some(finished),
                    push_started_datetime: Some(started + Duration::seconds(5)),
                    push_finished_datetime: Some(started + Duration::seconds(15)),
                    push_progress_total: Some(10),
                    push_progress_done: Some(10),
                    pull_started_datetime: Some(started + Duration::seconds(20)),
                    pull_finished_datetime: Some(started + Duration::seconds(40)),
                    pull_progress_total: Some(20),
                    pull_progress_done: Some(20),
                    integration_started_datetime: Some(started + Duration::seconds(41)),
                    integration_finished_datetime: Some(started + Duration::seconds(55)),
                    integration_progress_total: Some(5),
                    integration_progress_done: Some(5),
                    ..Default::default()
                }],
                ..Default::default()
            },
        )
        .await;

        let query = r#"{
            latestSyncStatus { __typename ... on FullSyncStatusV7Node {
                isSyncing
                summary { started finished }
                error { variant fullError }
                lastSuccessfulSync { started finished }
                push { started finished total done }
                pull { started finished total done }
                integration { started finished total done }
            } }
        }"#;

        let expected = json!({
            "latestSyncStatus": {
                "__typename": "FullSyncStatusV7Node",
                "isSyncing": false,
                "summary": {
                    "started": "2025-06-01T10:00:00+00:00",
                    "finished": "2025-06-01T10:01:00+00:00",
                },
                "error": null,
                "lastSuccessfulSync": {
                    "started": "2025-06-01T10:00:00+00:00",
                    "finished": "2025-06-01T10:01:00+00:00",
                },
                "push": {
                    "started": "2025-06-01T10:00:05+00:00",
                    "finished": "2025-06-01T10:00:15+00:00",
                    "total": 10,
                    "done": 10,
                },
                "pull": {
                    "started": "2025-06-01T10:00:20+00:00",
                    "finished": "2025-06-01T10:00:40+00:00",
                    "total": 20,
                    "done": 20,
                },
                "integration": {
                    "started": "2025-06-01T10:00:41+00:00",
                    "finished": "2025-06-01T10:00:55+00:00",
                    "total": 5,
                    "done": 5,
                },
            }
        });
        assert_graphql_query!(&settings, query, &None, expected, None);
    }
}
