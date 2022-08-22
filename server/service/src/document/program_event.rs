use chrono::NaiveDateTime;
use repository::{
    EqualFilter, PaginationOption, ProgramEventFilter, ProgramEventRepository, ProgramEventRow,
    ProgramEventRowRepository, ProgramEventSort, RepositoryError,
};
use util::uuid::uuid;

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub struct ReplaceEventInput {
    pub datetime: NaiveDateTime,
    pub r#type: String,
    pub name: Option<String>,
}

pub const MAX_LIMIT: u32 = 2000;
pub const MIN_LIMIT: u32 = 1;

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

    /// Removes all existing events for the given context and group and insert the provided events
    /// for the context and group.
    fn replace_event_group(
        &self,
        ctx: &ServiceContext,
        patient_id: Option<String>,
        context: &str,
        group: &str,
        events: Vec<ReplaceEventInput>,
    ) -> Result<(), RepositoryError> {
        let result = ctx
            .connection
            .transaction_sync(|con| -> Result<(), RepositoryError> {
                let repo = ProgramEventRepository::new(con);
                repo.delete(
                    ProgramEventFilter::new()
                        .context(EqualFilter::equal_to(context))
                        .group(EqualFilter::equal_to(group)),
                )?;
                let row_repo = ProgramEventRowRepository::new(con);
                for event in events {
                    row_repo.upsert_one(&ProgramEventRow {
                        id: uuid(),
                        datetime: event.datetime,
                        name_id: patient_id.clone(),
                        context: context.to_string(),
                        group: Some(group.to_string()),
                        r#type: event.r#type,
                        name: event.name,
                    })?;
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
    use chrono::Utc;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    use crate::service_provider::ServiceProvider;

    use super::*;

    #[actix_rt::test]
    async fn test_replace_events() {
        let (_, _, connection_manager, _) =
            setup_all("test_replace_events", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let ctx = service_provider.basic_context().unwrap();

        let service = service_provider.program_event_service;

        // try to insert and remove a single event
        service
            .replace_event_group(
                &ctx,
                None,
                "context",
                "group1",
                vec![ReplaceEventInput {
                    datetime: Utc::now().naive_local(),
                    r#type: "status".to_string(),
                    name: Some("data".to_string()),
                }],
            )
            .unwrap();
        let events = service
            .events(&ctx, None, Some(ProgramEventFilter::new()), None)
            .unwrap();
        assert_eq!(events.rows.len(), 1);
        // remove it:
        service
            .replace_event_group(&ctx, None, "context", "group1", vec![])
            .unwrap();
        let events = service
            .events(&ctx, None, Some(ProgramEventFilter::new()), None)
            .unwrap();
        assert_eq!(events.rows.len(), 0);

        // add multiple groups
        service
            .replace_event_group(
                &ctx,
                None,
                "context",
                "group1",
                vec![
                    ReplaceEventInput {
                        datetime: Utc::now().naive_local(),
                        r#type: "status1".to_string(),
                        name: Some("data".to_string()),
                    },
                    ReplaceEventInput {
                        datetime: Utc::now().naive_local(),
                        r#type: "status1".to_string(),
                        name: Some("data2".to_string()),
                    },
                ],
            )
            .unwrap();
        service
            .replace_event_group(
                &ctx,
                None,
                "context",
                "group2",
                vec![
                    ReplaceEventInput {
                        datetime: Utc::now().naive_local(),
                        r#type: "status2".to_string(),
                        name: Some("data".to_string()),
                    },
                    ReplaceEventInput {
                        datetime: Utc::now().naive_local(),
                        r#type: "status2".to_string(),
                        name: Some("data2".to_string()),
                    },
                ],
            )
            .unwrap();
        // expected: group1 -> 2 events, group2 -> 2 events
        let events = service
            .events(&ctx, None, Some(ProgramEventFilter::new()), None)
            .unwrap();
        assert_eq!(events.rows.len(), 4);

        // replace the 2 events from group2 by a single event with data="data3":
        service
            .replace_event_group(
                &ctx,
                None,
                "context",
                "group2",
                vec![ReplaceEventInput {
                    datetime: Utc::now().naive_local(),
                    r#type: "status2".to_string(),
                    name: Some("data3".to_string()),
                }],
            )
            .unwrap();
        let event = service
            .events(
                &ctx,
                None,
                Some(ProgramEventFilter::new().group(EqualFilter::equal_to("group2"))),
                None,
            )
            .unwrap()
            .rows
            .pop()
            .unwrap();
        assert_eq!(event.name, Some("data3".to_string()));
        // check group1 is still there
        let events = service
            .events(
                &ctx,
                None,
                Some(ProgramEventFilter::new().group(EqualFilter::equal_to("group1"))),
                None,
            )
            .unwrap();
        assert_eq!(events.rows.len(), 2);

        // remove group2 completely
        service
            .replace_event_group(&ctx, None, "context", "group2", vec![])
            .unwrap();
        let events = service
            .events(
                &ctx,
                None,
                Some(ProgramEventFilter::new().group(EqualFilter::equal_to("group2"))),
                None,
            )
            .unwrap();
        assert_eq!(events.rows.len(), 0);
        // check group1 is still there
        let events = service
            .events(
                &ctx,
                None,
                Some(ProgramEventFilter::new().group(EqualFilter::equal_to("group1"))),
                None,
            )
            .unwrap();
        assert_eq!(events.rows.len(), 2);
    }
}
