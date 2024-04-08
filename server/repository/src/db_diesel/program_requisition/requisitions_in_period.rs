use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_equal_filter, apply_string_filter},
    repository_error::RepositoryError,
    EqualFilter, RequisitionRowType, StorageConnection, StringFilter,
};

table! {
    requisitions_in_period (id) {
        id -> Text,
        program_id -> Text,
        period_id -> Text,
        store_id -> Text,
        order_type -> Text,
        count -> BigInt,
        #[sql_name = "type"] type_ -> crate::db_diesel::requisition::requisition_row::RequisitionRowTypeMapping,
    }
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct RequisitionsInPeriodFilter {
    pub program_id: Option<EqualFilter<String>>,
    pub period_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub order_type: Option<StringFilter>,
    pub r#type: Option<EqualFilter<RequisitionRowType>>,
}

#[derive(Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq)]
#[diesel(table_name = requisitions_in_period)]
pub struct RequisitionsInPeriod {
    id: String,
    pub program_id: String,
    pub period_id: String,
    store_id: String,
    pub order_type: String,
    pub count: i64,
    #[diesel(column_name = type_)]
    pub r#type: RequisitionRowType,
}

impl Default for RequisitionsInPeriod {
    fn default() -> Self {
        Self {
            r#type: RequisitionRowType::Request,
            // Default
            id: Default::default(),
            program_id: Default::default(),
            period_id: Default::default(),
            store_id: Default::default(),
            order_type: Default::default(),
            count: Default::default(),
        }
    }
}

pub struct RequisitionsInPeriodRepository<'a> {
    connection: &'a mut StorageConnection,
}

use self::requisitions_in_period::dsl as requisitions_in_period_dsl;

impl<'a> RequisitionsInPeriodRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        RequisitionsInPeriodRepository { connection }
    }

    pub fn query(
        &mut self,
        RequisitionsInPeriodFilter {
            program_id,
            period_id,
            store_id,
            order_type,
            r#type,
        }: RequisitionsInPeriodFilter,
    ) -> Result<Vec<RequisitionsInPeriod>, RepositoryError> {
        let mut query = requisitions_in_period_dsl::requisitions_in_period.into_boxed();

        apply_equal_filter!(query, program_id, requisitions_in_period_dsl::program_id);
        apply_equal_filter!(query, period_id, requisitions_in_period_dsl::period_id);
        apply_equal_filter!(query, store_id, requisitions_in_period_dsl::store_id);
        apply_equal_filter!(query, r#type, requisitions_in_period_dsl::type_);
        apply_string_filter!(query, order_type, requisitions_in_period_dsl::order_type);

        //  Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result = query.load::<RequisitionsInPeriod>(&mut self.connection.connection)?;

        Ok(result)
    }
}

impl RequisitionsInPeriodFilter {
    pub fn new() -> RequisitionsInPeriodFilter {
        Default::default()
    }

    pub fn program_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_id = Some(filter);
        self
    }

    pub fn period_id(mut self, filter: EqualFilter<String>) -> Self {
        self.period_id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn order_type(mut self, filter: StringFilter) -> Self {
        self.order_type = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<RequisitionRowType>) -> Self {
        self.r#type = Some(filter);
        self
    }
}

#[cfg(test)]
mod test {
    use std::cmp::Ordering;

    use crate::{
        mock::{
            mock_name_store_a, mock_period_schedule_1, mock_store_a, mock_store_b, MockData,
            MockDataInserts,
        },
        test_db::setup_all_with_data,
        ContextRow, EqualFilter, MasterListRow, PeriodRow, ProgramRow, RequisitionRow,
        RequisitionRowType, RequisitionsInPeriod, RequisitionsInPeriodFilter,
        RequisitionsInPeriodRepository,
    };

    #[actix_rt::test]
    async fn requisitions_in_period_repository() {
        let period1 = PeriodRow {
            id: "period1".to_string(),
            name: "period1".to_string(),
            period_schedule_id: mock_period_schedule_1().id,
            ..Default::default()
        };
        let period2 = PeriodRow {
            id: "period2".to_string(),
            name: "period2".to_string(),
            period_schedule_id: mock_period_schedule_1().id,
            ..Default::default()
        };
        let period3 = PeriodRow {
            id: "period3".to_string(),
            name: "period3".to_string(),
            period_schedule_id: mock_period_schedule_1().id,
            ..Default::default()
        };
        let period4 = PeriodRow {
            id: "period4".to_string(),
            name: "period4".to_string(),
            period_schedule_id: mock_period_schedule_1().id,
            ..Default::default()
        };
        let master_list = MasterListRow {
            id: "master_list1".to_string(),
            ..Default::default()
        };
        let context1 = ContextRow {
            id: "program1".to_string(),
            name: "program1".to_string(),
        };
        let program1 = ProgramRow {
            id: "program1".to_string(),
            master_list_id: master_list.id.clone(),
            context_id: context1.id.clone(),
            ..Default::default()
        };
        let context2 = ContextRow {
            id: "program2".to_string(),
            name: "program2".to_string(),
        };
        let program2 = ProgramRow {
            id: "program2".to_string(),
            master_list_id: master_list.id.clone(),
            context_id: context2.id.clone(),
            ..Default::default()
        };
        // Same order type same period
        let requisition1 = RequisitionRow {
            id: "requisition1".to_string(),
            order_type: Some("Order Type 1".to_string()),
            name_link_id: mock_name_store_a().id,
            store_id: mock_store_a().id,
            period_id: Some(period2.id.clone()),
            program_id: Some(program1.id.clone()),
            r#type: RequisitionRowType::Request,
            ..Default::default()
        };
        // Same order type same period
        let requisition2 = RequisitionRow {
            id: "requisition2".to_string(),
            order_type: Some("Order Type 1".to_string()),
            name_link_id: mock_name_store_a().id,
            store_id: mock_store_a().id,
            period_id: Some(period2.id.clone()),
            program_id: Some(program1.id.clone()),
            r#type: RequisitionRowType::Request,
            ..Default::default()
        };
        // Same order type same period, different program
        let requisition3 = RequisitionRow {
            id: "requisition3".to_string(),
            order_type: Some("Order Type 1".to_string()),
            name_link_id: mock_name_store_a().id,
            store_id: mock_store_a().id,
            period_id: Some(period2.id.clone()),
            program_id: Some(program2.id.clone()),
            r#type: RequisitionRowType::Request,
            ..Default::default()
        };
        // Different order type same period
        let requisition4 = RequisitionRow {
            id: "requisition4".to_string(),
            order_type: Some("Order Type 2".to_string()),
            name_link_id: mock_name_store_a().id,
            store_id: mock_store_a().id,
            period_id: Some(period2.id.clone()),
            program_id: Some(program1.id.clone()),
            r#type: RequisitionRowType::Request,
            ..Default::default()
        };
        // Different order type same period, different store
        let requisition5 = RequisitionRow {
            id: "requisition5".to_string(),
            order_type: Some("Order Type 2".to_string()),
            name_link_id: mock_name_store_a().id,
            store_id: mock_store_b().id,
            period_id: Some(period2.id.clone()),
            program_id: Some(program1.id.clone()),
            r#type: RequisitionRowType::Request,
            ..Default::default()
        };
        // Same as requisition1, but it's a response requisition
        let requisition6 = RequisitionRow {
            id: "requisition6".to_string(),
            order_type: Some("Order Type 1".to_string()),
            name_link_id: mock_name_store_a().id,
            store_id: mock_store_a().id,
            period_id: Some(period2.id.clone()),
            program_id: Some(program1.id.clone()),
            r#type: RequisitionRowType::Response,
            ..Default::default()
        };

        let (_, mut connection, _, _) = setup_all_with_data(
            "requisitions_in_period_repository",
            MockDataInserts::none().names().stores().period_schedules(),
            MockData {
                periods: vec![
                    period1.clone(),
                    period2.clone(),
                    period3.clone(),
                    period4.clone(),
                ],
                contexts: vec![context1, context2],
                programs: vec![program1.clone(), program2.clone()],
                requisitions: vec![
                    requisition1.clone(),
                    requisition2.clone(),
                    requisition3.clone(),
                    requisition4.clone(),
                    requisition5.clone(),
                    requisition6,
                ],
                master_lists: vec![master_list],
                ..Default::default()
            },
        )
        .await;

        let mut repo = RequisitionsInPeriodRepository::new(&mut connection);

        // TEST query for first program in first store, and all periods
        let mut filter = RequisitionsInPeriodFilter::new()
            .program_id(EqualFilter::equal_to(&program1.id.clone()))
            .r#type(RequisitionRowType::Request.equal_to())
            .period_id(EqualFilter::equal_any(vec![
                period1.id.clone(),
                period2.id.clone(),
                period3.id.clone(),
                period4.id.clone(),
            ]))
            .store_id(EqualFilter::equal_to(&mock_store_a().id));
        let mut result = repo.query(filter.clone()).unwrap();
        result.sort_by(sort);

        assert_eq!(
            result,
            vec![
                RequisitionsInPeriod {
                    id: "n/a".to_string(),
                    period_id: period2.id.clone(),
                    program_id: program1.id.clone(),
                    store_id: mock_store_a().id,
                    order_type: "Order Type 1".to_string(),
                    count: 2,
                    r#type: RequisitionRowType::Request,
                },
                RequisitionsInPeriod {
                    id: "n/a".to_string(),
                    period_id: period2.id.clone(),
                    program_id: program1.id.clone(),
                    store_id: mock_store_a().id,
                    order_type: "Order Type 2".to_string(),
                    count: 1,
                    r#type: RequisitionRowType::Request,
                },
            ]
        );

        // TEST query for both programs in first store, and all periods
        filter.program_id = Some(EqualFilter::equal_any(vec![
            program1.id.clone(),
            program2.id.clone(),
        ]));

        let mut result = repo.query(filter.clone()).unwrap();
        result.sort_by(sort);

        assert_eq!(
            result,
            vec![
                RequisitionsInPeriod {
                    id: "n/a".to_string(),
                    period_id: period2.id.clone(),
                    program_id: program1.id.clone(),
                    store_id: mock_store_a().id,
                    order_type: "Order Type 1".to_string(),
                    count: 2,
                    r#type: RequisitionRowType::Request,
                },
                RequisitionsInPeriod {
                    id: "n/a".to_string(),
                    period_id: period2.id.clone(),
                    program_id: program2.id.clone(),
                    store_id: mock_store_a().id,
                    order_type: "Order Type 1".to_string(),
                    count: 1,
                    r#type: RequisitionRowType::Request,
                },
                RequisitionsInPeriod {
                    id: "n/a".to_string(),
                    period_id: period2.id.clone(),
                    program_id: program1.id.clone(),
                    store_id: mock_store_a().id,
                    order_type: "Order Type 2".to_string(),
                    count: 1,
                    r#type: RequisitionRowType::Request,
                },
            ]
        );

        // TEST query for just store b

        let mut result = repo
            .query(
                RequisitionsInPeriodFilter::new()
                    .store_id(EqualFilter::equal_to(&mock_store_b().id)),
            )
            .unwrap();
        result.sort_by(sort);

        assert_eq!(
            result,
            vec![RequisitionsInPeriod {
                id: "n/a".to_string(),
                period_id: period2.id.clone(),
                program_id: program1.id.clone(),
                store_id: mock_store_b().id,
                order_type: "Order Type 2".to_string(),
                count: 1,
                r#type: RequisitionRowType::Request,
            }]
        );
    }

    fn sort(a: &RequisitionsInPeriod, b: &RequisitionsInPeriod) -> Ordering {
        let by_period_id = a.period_id.cmp(&b.period_id);

        if Ordering::Equal == by_period_id {
            let by_program_id = a.program_id.cmp(&b.program_id);
            if Ordering::Equal == by_period_id {
                return a.order_type.cmp(&b.order_type);
            }

            return by_program_id;
        }
        by_period_id
    }
}
