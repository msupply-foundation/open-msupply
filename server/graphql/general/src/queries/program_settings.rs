use async_graphql::*;
use chrono::NaiveDate;
use graphql_types::types::{MasterListNode, NameNode, PeriodNode};
use repository::{MasterListRow, Name, NameRow, PeriodRow};

#[derive(SimpleObject)]
pub struct ProgramRequisitionOrderTypeNode {
    pub name: String,
    pub id: String,
    pub available_periods: Vec<PeriodNode>,
}

#[derive(SimpleObject)]
pub struct ProgramRequisitionSettingNode {
    /// Program name
    pub program_name: String,
    /// Program id
    pub program_id: String,
    pub suppliers: Vec<NameNode>,
    pub master_list: MasterListNode,
    pub order_types: Vec<ProgramRequisitionOrderTypeNode>,
}

pub fn program_requisition_settings(_store_id: &str) -> Vec<ProgramRequisitionSettingNode> {
    vec![
        ProgramRequisitionSettingNode {
            program_name: "hiv".to_string(),
            program_id: "hiv".to_string(),
            master_list: MasterListNode::from_domain(MasterListRow {
                name: "testList".to_string(),
                ..MasterListRow::default()
            }),

            suppliers: vec![NameNode::from_domain(Name {
                name_row: NameRow {
                    name: "test_name".to_string(),
                    ..NameRow::default()
                },
                name_store_join_row: None,
                store_row: None,
            })],
            order_types: vec![
                ProgramRequisitionOrderTypeNode {
                    name: "Normal".to_string(),
                    id: "mock_id_1".to_string(),
                    available_periods: vec![
                        PeriodNode::from_domain(PeriodRow {
                            id: "april".to_string(),
                            name: "April 2023".to_string(),
                            start_date: NaiveDate::from_ymd_opt(2023, 4, 01).unwrap(),
                            end_date: NaiveDate::from_ymd_opt(2023, 4, 30).unwrap(),
                            period_schedule_id: "monthly_id".to_string(),
                        }),
                        PeriodNode::from_domain(PeriodRow {
                            id: "name".to_string(),
                            name: "May 2023".to_string(),
                            start_date: NaiveDate::from_ymd_opt(2023, 5, 01).unwrap(),
                            end_date: NaiveDate::from_ymd_opt(2023, 5, 30).unwrap(),
                            period_schedule_id: "monthly_id".to_string(),
                        }),
                    ],
                },
                ProgramRequisitionOrderTypeNode {
                    name: "Emergency".to_string(),
                    id: "mock_id_2".to_string(),
                    available_periods: vec![
                        PeriodNode::from_domain(PeriodRow {
                            id: "april".to_string(),
                            name: "April 2023".to_string(),
                            start_date: NaiveDate::from_ymd_opt(2023, 4, 01).unwrap(),
                            end_date: NaiveDate::from_ymd_opt(2023, 4, 30).unwrap(),
                            period_schedule_id: "monthly_id".to_string(),
                        }),
                        PeriodNode::from_domain(PeriodRow {
                            id: "may".to_string(),
                            name: "May 2023".to_string(),
                            start_date: NaiveDate::from_ymd_opt(2023, 5, 01).unwrap(),
                            end_date: NaiveDate::from_ymd_opt(2023, 5, 30).unwrap(),
                            period_schedule_id: "monthly_id".to_string(),
                        }),
                    ],
                },
            ],
        },
        // Only emergency order has period
        ProgramRequisitionSettingNode {
            program_name: "tb".to_string(),
            program_id: "tb".to_string(),
            master_list: MasterListNode::from_domain(MasterListRow {
                name: "testList".to_string(),
                ..MasterListRow::default()
            }),

            suppliers: vec![NameNode::from_domain(Name {
                name_row: NameRow {
                    name: "test_name".to_string(),
                    ..NameRow::default()
                },
                name_store_join_row: None,
                store_row: None,
            })],
            order_types: vec![
                ProgramRequisitionOrderTypeNode {
                    name: "Normal".to_string(),
                    id: "mock_id_3".to_string(),
                    available_periods: vec![],
                },
                ProgramRequisitionOrderTypeNode {
                    name: "Emergency".to_string(),
                    id: "mock_id_4".to_string(),
                    available_periods: vec![PeriodNode::from_domain(PeriodRow {
                        id: "may".to_string(),
                        name: "May 2023".to_string(),
                        start_date: NaiveDate::from_ymd_opt(2023, 5, 01).unwrap(),
                        end_date: NaiveDate::from_ymd_opt(2023, 5, 30).unwrap(),
                        period_schedule_id: "monthly_id".to_string(),
                    })],
                },
            ],
        },
    ]
}
