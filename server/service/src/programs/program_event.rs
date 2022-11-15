use std::collections::HashMap;

use chrono::{Duration, NaiveDate, NaiveDateTime};
use repository::{
    DatetimeFilter, EqualFilter, Pagination, PaginationOption, ProgramEventFilter,
    ProgramEventRepository, ProgramEventRow, ProgramEventRowRepository, ProgramEventSort,
    ProgramEventSortField, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub struct EventInput {
    pub active_start_datetime: NaiveDateTime,
    pub document_type: String,
    pub document_name: Option<String>,
    pub r#type: String,
    pub name: Option<String>,
}

pub const MAX_LIMIT: u32 = 2000;
pub const MIN_LIMIT: u32 = 1;

/// Events are grouped and updated by the fields in this struct
#[derive(Hash, PartialEq, Eq)]
struct EventTarget {
    pub patient_id: String,
    pub document_type: String,
    pub document_name: Option<String>,
    pub r#type: String,
}

struct StackEvent {
    pub active_start_datetime: NaiveDateTime,
    pub name: Option<String>,
}

/// NaiveDateTime::MAX doesn't serializes well in sqlite (+262143-12-31 23:59:59.999999999 is
/// smaller than any other datetime)
fn max_datetime() -> NaiveDateTime {
    NaiveDate::from_ymd(9999, 9, 9).and_hms(9, 9, 9)
}

fn event_target_filter(target: &EventTarget) -> ProgramEventFilter {
    let mut filter = ProgramEventFilter::new()
        .patient_id(EqualFilter::equal_to(&target.patient_id))
        .document_type(EqualFilter::equal_to(&target.document_type))
        .r#type(EqualFilter::equal_to(&target.r#type));
    if let Some(document_name) = &target.document_name {
        filter = filter.document_name(EqualFilter::equal_to(&document_name));
    }
    filter
}

fn remove_event_stack(
    datetime: NaiveDateTime,
    event_target: &EventTarget,
    connection: &StorageConnection,
) -> Result<(), RepositoryError> {
    let repo = ProgramEventRepository::new(connection);
    // get the longest active_end_datetime from the stack that is being removed
    let stack_events = repo.query(
        Pagination::one(),
        Some(event_target_filter(event_target).datetime(DatetimeFilter::equal_to(datetime))),
        Some(ProgramEventSort {
            key: ProgramEventSortField::ActiveStartDatetime,
            desc: Some(true),
        }),
    )?;
    let Some(longest) = stack_events.get(0) else {
        // no stack found -> done
        return Ok(());
    };
    // delete the stack
    repo.delete(event_target_filter(event_target).datetime(DatetimeFilter::equal_to(datetime)))?;

    // TODO: Below is some room for optimization. We might update the same events later...
    // For simplicity we cleanly remove the whole stack though.

    // update active_end_datetime of the previous stack
    let previous_stack = repo.query_by_filter(
        event_target_filter(event_target).active_end_datetime(DatetimeFilter::equal_to(datetime)),
    )?;
    for mut prev in previous_stack {
        prev.active_end_datetime = longest.active_end_datetime;
        ProgramEventRowRepository::new(connection).upsert_one(&prev)?;
    }

    Ok(())
}

pub trait ProgramEventServiceTrait: Sync + Send {
    fn events(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<ProgramEventFilter>,
        sort: Option<ProgramEventSort>,
    ) -> Result<ListResult<ProgramEventRow>, ListError> {
        let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
        let repository = ProgramEventRepository::new(&ctx.connection);
        Ok(ListResult {
            rows: repository.query(pagination, filter.clone(), sort)?,
            count: i64_to_u32(repository.count(filter)?),
        })
    }

    fn active_events(
        &self,
        ctx: &ServiceContext,
        at: NaiveDateTime,
        pagination: Option<PaginationOption>,
        filter: Option<ProgramEventFilter>,
        sort: Option<ProgramEventSort>,
    ) -> Result<ListResult<ProgramEventRow>, ListError> {
        let filter = filter
            .unwrap_or(ProgramEventFilter::new())
            .active_start_datetime(DatetimeFilter::before_or_equal_to(at))
            .active_end_datetime(DatetimeFilter::after_or_equal_to(
                // TODO: add an `after` filter
                at.checked_add_signed(Duration::nanoseconds(1))
                    .unwrap_or(at),
            ));
        self.events(ctx, pagination, Some(filter), sort)
    }

    /// Upserts all events of a patient with a given datetime, i.e. it removes exiting events and
    /// inserts the provided list.
    /// For example, all events of a single document with the timestamp `datetime` can be updated
    /// using the method.
    ///
    /// Note, this assumes that no two documents for a single patient are changed at exactly the
    /// same time.
    fn upsert_events(
        &self,
        ctx: &ServiceContext,
        patient_id: String,
        datetime: NaiveDateTime,
        events: Vec<EventInput>,
    ) -> Result<(), RepositoryError> {
        // TODO do we need to lock rows in case events are updated concurrently?
        let targets = events.into_iter().fold(
            HashMap::<EventTarget, Vec<StackEvent>>::new(),
            |mut map, it| {
                let target = EventTarget {
                    patient_id: patient_id.clone(),
                    document_type: it.document_type,
                    document_name: it.document_name,
                    r#type: it.r#type,
                };

                map.entry(target).or_insert(vec![]).push(StackEvent {
                    // sanitise active_start_datetime to not be small than datetime
                    active_start_datetime: datetime.max(it.active_start_datetime),
                    name: it.name,
                });
                map
            },
        );
        let result = ctx
            .connection
            .transaction_sync(|con| -> Result<(), RepositoryError> {
                let repo = ProgramEventRepository::new(con);
                for (target, mut events) in targets {
                    // remove existing stack, if there is any
                    remove_event_stack(datetime, &target, con)?;

                    // find events that need to be adjusted
                    let overlaps = repo.query(
                        Pagination::all(),
                        Some(
                            event_target_filter(&target)
                                .datetime(DatetimeFilter::before_or_equal_to(datetime))
                                .active_end_datetime(DatetimeFilter::after_or_equal_to(datetime)),
                        ),
                        Some(ProgramEventSort {
                            key: ProgramEventSortField::ActiveEndDatetime,
                            desc: Some(true),
                        }),
                    )?;
                    let active_end_datetime = overlaps
                        .get(0)
                        .map(|it| it.active_end_datetime)
                        .unwrap_or(max_datetime());
                    for mut overlap in overlaps {
                        overlap.active_end_datetime = datetime;
                        ProgramEventRowRepository::new(con).upsert_one(&overlap)?;
                    }

                    events.sort_by(|a, b| b.active_start_datetime.cmp(&a.active_start_datetime));
                    let mut events = events
                        .into_iter()
                        .map(|it| ProgramEventRow {
                            id: uuid(),
                            datetime,
                            active_start_datetime: it.active_start_datetime,
                            active_end_datetime,
                            patient_id: Some(patient_id.clone()),
                            document_type: target.document_type.clone(),
                            document_name: target.document_name.clone(),
                            r#type: target.r#type.clone(),
                            name: it.name,
                        })
                        .collect::<Vec<_>>();
                    // adjust end times within the stack
                    for n in 0..events.len() - 1 {
                        let active_datetime = events[n].active_start_datetime;
                        events[n + 1].active_end_datetime = active_datetime;
                    }
                    for event in events {
                        ProgramEventRowRepository::new(con).upsert_one(&event)?;
                    }
                }

                Ok(())
            })
            .map_err(|err| err.to_inner_error())?;
        Ok(result)
    }
}

pub struct ProgramEventService {}
impl ProgramEventServiceTrait for ProgramEventService {}

#[cfg(test)]
mod test {
    use repository::{mock::MockDataInserts, test_db::setup_all};

    use crate::service_provider::ServiceProvider;

    use super::*;

    // asserts an unfiltered active_events() with time `at` contains rows with the expected names
    macro_rules! assert_names {
        ($service:expr, $ctx:expr, $at:expr, $expected:expr) => {{
            let events = $service
                .active_events(
                    &$ctx,
                    NaiveDateTime::from_timestamp($at, 0),
                    None,
                    Some(ProgramEventFilter::new()),
                    None,
                )
                .unwrap();
            let mut expected: Vec<&str> = $expected;
            expected.sort();
            let expected = expected
                .into_iter()
                .map(|it| it.to_string())
                .collect::<Vec<_>>();
            let mut actual_names = events
                .rows
                .iter()
                .map(|it| it.name.clone().unwrap())
                .collect::<Vec<_>>();
            actual_names.sort();
            assert_eq!(expected, actual_names);
        }};
    }

    #[actix_rt::test]
    async fn test_basic_program_events() {
        let (_, _, connection_manager, _) =
            setup_all("test_basic_program_events", MockDataInserts::none().names()).await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let ctx = service_provider.basic_context().unwrap();

        let service = service_provider.program_event_service;

        // try to insert a single event
        // ----------x
        //          10
        service
            .upsert_events(
                &ctx,
                "patient2".to_string(),
                NaiveDateTime::from_timestamp(10, 0),
                vec![EventInput {
                    active_start_datetime: NaiveDateTime::from_timestamp(10, 0),
                    document_type: "DocType".to_string(),
                    document_name: None,
                    r#type: "status".to_string(),
                    name: Some("data1".to_string()),
                }],
            )
            .unwrap();
        assert_names!(service, ctx, 5, vec![]);
        assert_names!(service, ctx, 15, vec!["data1"]);

        // insert later event with different active_start_datetime
        // ----------x----------x
        //          10         20-------->30
        service
            .upsert_events(
                &ctx,
                "patient2".to_string(),
                NaiveDateTime::from_timestamp(20, 0),
                vec![EventInput {
                    active_start_datetime: NaiveDateTime::from_timestamp(30, 0),
                    document_type: "DocType".to_string(),
                    document_name: None,
                    r#type: "status".to_string(),
                    name: Some("data2".to_string()),
                }],
            )
            .unwrap();
        assert_names!(service, ctx, 19, vec!["data1"]);
        assert_names!(service, ctx, 25, vec![]);
        assert_names!(service, ctx, 30, vec!["data2"]);

        // terminate the second event
        // ----------x----------x-----x
        //          10         20--------->30
        //                           25-------->35
        service
            .upsert_events(
                &ctx,
                "patient2".to_string(),
                NaiveDateTime::from_timestamp(25, 0),
                vec![EventInput {
                    active_start_datetime: NaiveDateTime::from_timestamp(35, 0),
                    document_type: "DocType".to_string(),
                    document_name: None,
                    r#type: "status".to_string(),
                    name: Some("data3".to_string()),
                }],
            )
            .unwrap();
        assert_names!(service, ctx, 31, vec![]);
        assert_names!(service, ctx, 40, vec!["data3"]);

        // add an event for different type (should show up in results together with existing)
        service
            .upsert_events(
                &ctx,
                "patient2".to_string(),
                NaiveDateTime::from_timestamp(40, 0),
                vec![EventInput {
                    active_start_datetime: NaiveDateTime::from_timestamp(40, 0),
                    document_type: "DocType2".to_string(),
                    document_name: None,
                    r#type: "status".to_string(),
                    name: Some("data4".to_string()),
                }],
            )
            .unwrap();
        assert_names!(service, ctx, 50, vec!["data3", "data4"]);
    }

    #[actix_rt::test]
    async fn test_event_stacks() {
        let (_, _, connection_manager, _) =
            setup_all("test_event_stacks", MockDataInserts::none().names()).await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let ctx = service_provider.basic_context().unwrap();

        let service = service_provider.program_event_service;

        // add stack s1 and test that status changes over time
        // ----------s1
        //           10->10
        //           10------->20
        service
            .upsert_events(
                &ctx,
                "patient2".to_string(),
                NaiveDateTime::from_timestamp(10, 0),
                vec![
                    EventInput {
                        active_start_datetime: NaiveDateTime::from_timestamp(10, 0),
                        document_type: "DocType".to_string(),
                        document_name: None,
                        r#type: "status".to_string(),
                        name: Some("G1_1".to_string()),
                    },
                    EventInput {
                        active_start_datetime: NaiveDateTime::from_timestamp(20, 0),
                        document_type: "DocType".to_string(),
                        document_name: None,
                        r#type: "status".to_string(),
                        name: Some("G1_2".to_string()),
                    },
                ],
            )
            .unwrap();
        assert_names!(service, ctx, 5, vec![]);
        assert_names!(service, ctx, 10, vec!["G1_1"]);
        assert_names!(service, ctx, 25, vec!["G1_2"]);

        // replace stack s1 and test that status changes over time
        // ----------s1
        //           10---->15
        //           10--------------->30
        service
            .upsert_events(
                &ctx,
                "patient2".to_string(),
                NaiveDateTime::from_timestamp(10, 0),
                vec![
                    EventInput {
                        active_start_datetime: NaiveDateTime::from_timestamp(15, 0),
                        document_type: "DocType".to_string(),
                        document_name: None,
                        r#type: "status".to_string(),
                        name: Some("G1_3".to_string()),
                    },
                    EventInput {
                        active_start_datetime: NaiveDateTime::from_timestamp(30, 0),
                        document_type: "DocType".to_string(),
                        document_name: None,
                        r#type: "status".to_string(),
                        name: Some("G1_4".to_string()),
                    },
                ],
            )
            .unwrap();
        assert_names!(service, ctx, 5, vec![]);
        assert_names!(service, ctx, 15, vec!["G1_3"]);
        assert_names!(service, ctx, 30, vec!["G1_4"]);
        assert_names!(service, ctx, 35, vec!["G1_4"]);

        // test "cutting" of an event from one stack when inserting a later stack
        // ----------g1-----------g2
        //           10---->15
        //           10--------------->30
        //                        25------->35
        //                        25------------->40
        service
            .upsert_events(
                &ctx,
                "patient2".to_string(),
                NaiveDateTime::from_timestamp(25, 0),
                vec![
                    EventInput {
                        active_start_datetime: NaiveDateTime::from_timestamp(35, 0),
                        document_type: "DocType".to_string(),
                        document_name: None,
                        r#type: "status".to_string(),
                        name: Some("G2_1".to_string()),
                    },
                    EventInput {
                        active_start_datetime: NaiveDateTime::from_timestamp(40, 0),
                        document_type: "DocType".to_string(),
                        document_name: None,
                        r#type: "status".to_string(),
                        name: Some("G2_2".to_string()),
                    },
                ],
            )
            .unwrap();
        assert_names!(service, ctx, 26, vec![]);
        assert_names!(service, ctx, 31, vec![]);
        assert_names!(service, ctx, 35, vec!["G2_1"]);
        assert_names!(service, ctx, 40, vec!["G2_2"]);
    }
}
