use async_graphql::*;
use chrono::NaiveDate;

#[derive(SimpleObject)]
pub struct ConsumptionHistoryNode {
    pub consumption: u32,
    pub amc: f64,
    pub date: NaiveDate,
}

#[derive(SimpleObject)]
pub struct ConsumptionHistoryConnector {
    total_count: u32,
    nodes: Vec<ConsumptionHistoryNode>,
}

#[derive(SimpleObject, Clone)]
pub struct StockEvolutionNode {
    pub projected_stock_on_hand: Option<u32>,
    pub historic_stock_on_hand: Option<u32>,
    pub date: NaiveDate,
}

#[derive(SimpleObject)]
pub struct StockEvolutionConnector {
    total_count: u32,
    nodes: Vec<StockEvolutionNode>,
}

#[derive(SimpleObject)]
pub struct SuggestedQuantityCalculationNode {
    pub average_monthly_consumption: f64,
    pub stock_on_hand: u32,
    /// If stock on hand > minimum stock on hand, suggested will be 0
    pub minimum_stock_on_hand: u32,
    /// Target
    pub maximum_stock_on_hand: u32,
    pub suggested: u32,
}

#[derive(SimpleObject)]
pub struct ItemChartDataNode {
    pub consumption_history: ConsumptionHistoryConnector,
    pub stock_evolution: StockEvolutionConnector,
    pub suggested_quantity_calculation: SuggestedQuantityCalculationNode,
}

impl Default for ItemChartDataNode {
    fn default() -> Self {
        let mut consumption_history = vec![
            ConsumptionHistoryNode {
                consumption: 100,
                amc: 100.0,
                date: NaiveDate::from_ymd(2022, 02, 01),
            },
            ConsumptionHistoryNode {
                consumption: 90,
                amc: 95.0,
                date: NaiveDate::from_ymd(2022, 01, 01),
            },
            ConsumptionHistoryNode {
                consumption: 85,
                amc: 92.0,
                date: NaiveDate::from_ymd(2021, 12, 01),
            },
            ConsumptionHistoryNode {
                consumption: 110,
                amc: 95.0,
                date: NaiveDate::from_ymd(2021, 11, 01),
            },
            ConsumptionHistoryNode {
                consumption: 130,
                amc: 110.0,
                date: NaiveDate::from_ymd(2021, 10, 01),
            },
            ConsumptionHistoryNode {
                consumption: 70,
                amc: 80.0,
                date: NaiveDate::from_ymd(2021, 09, 01),
            },
            ConsumptionHistoryNode {
                consumption: 80,
                amc: 85.0,
                date: NaiveDate::from_ymd(2021, 08, 01),
            },
            ConsumptionHistoryNode {
                consumption: 85,
                amc: 85.0,
                date: NaiveDate::from_ymd(2021, 07, 01),
            },
            ConsumptionHistoryNode {
                consumption: 100,
                amc: 90.0,
                date: NaiveDate::from_ymd(2021, 06, 01),
            },
            ConsumptionHistoryNode {
                consumption: 75,
                amc: 80.0,
                date: NaiveDate::from_ymd(2021, 05, 01),
            },
            ConsumptionHistoryNode {
                consumption: 60,
                amc: 65.0,
                date: NaiveDate::from_ymd(2021, 04, 01),
            },
            ConsumptionHistoryNode {
                consumption: 80,
                amc: 75.0,
                date: NaiveDate::from_ymd(2021, 03, 01),
            },
        ];
        consumption_history.sort_by(|a, b| a.date.cmp(&b.date));
        let mut stock_evolution = vec![
            // After receiving
            StockEvolutionNode {
                projected_stock_on_hand: Some(180),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 11),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(177),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 12),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(174),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 13),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(171),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 14),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(168),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 15),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(165),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 16),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(162),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 17),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(159),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 18),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(156),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 19),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(153),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 20),
            },
            // Before receiving
            StockEvolutionNode {
                projected_stock_on_hand: Some(20),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 02),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(17),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 03),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(14),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 04),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(11),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 05),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(8),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 06),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(5),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 07),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(2),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 08),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(0),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 09),
            },
            StockEvolutionNode {
                projected_stock_on_hand: Some(0),
                historic_stock_on_hand: None,
                date: NaiveDate::from_ymd(2021, 02, 10),
            },
            // Historic after receiving
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(24),
                date: NaiveDate::from_ymd(2021, 01, 31),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(29),
                date: NaiveDate::from_ymd(2021, 01, 30),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(30),
                date: NaiveDate::from_ymd(2021, 01, 29),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(32),
                date: NaiveDate::from_ymd(2021, 01, 28),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(37),
                date: NaiveDate::from_ymd(2021, 01, 27),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(39),
                date: NaiveDate::from_ymd(2021, 01, 26),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(39),
                date: NaiveDate::from_ymd(2021, 01, 25),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(40),
                date: NaiveDate::from_ymd(2021, 01, 24),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(45),
                date: NaiveDate::from_ymd(2021, 01, 23),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(46),
                date: NaiveDate::from_ymd(2021, 01, 22),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(48),
                date: NaiveDate::from_ymd(2021, 01, 21),
            },
            // Historic Before Receiving
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(16),
                date: NaiveDate::from_ymd(2021, 01, 11),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(12),
                date: NaiveDate::from_ymd(2021, 01, 12),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(11),
                date: NaiveDate::from_ymd(2021, 01, 13),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(8),
                date: NaiveDate::from_ymd(2021, 01, 14),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(5),
                date: NaiveDate::from_ymd(2021, 01, 15),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(3),
                date: NaiveDate::from_ymd(2021, 01, 16),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(0),
                date: NaiveDate::from_ymd(2021, 01, 17),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(0),
                date: NaiveDate::from_ymd(2021, 01, 18),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(0),
                date: NaiveDate::from_ymd(2021, 01, 19),
            },
            StockEvolutionNode {
                projected_stock_on_hand: None,
                historic_stock_on_hand: Some(0),
                date: NaiveDate::from_ymd(2021, 01, 20),
            },
        ];
        stock_evolution.sort_by(|a, b| a.date.cmp(&b.date));

        Self {
            consumption_history: ConsumptionHistoryConnector {
                total_count: 12,
                nodes: consumption_history,
            },
            stock_evolution: StockEvolutionConnector {
                total_count: 20,
                nodes: stock_evolution,
            },
            suggested_quantity_calculation: SuggestedQuantityCalculationNode {
                average_monthly_consumption: 100.0,
                stock_on_hand: 20,
                minimum_stock_on_hand: 30,
                maximum_stock_on_hand: 200,
                suggested: 180,
            },
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::{EmptyMutation, Object};
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;

    use crate::types::ItemChartDataNode;

    #[actix_rt::test]
    async fn graphq_item_chart_data_node() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphl_test(
            TestQuery,
            EmptyMutation,
            "graphq_item_chart_data_node",
            MockDataInserts::none(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query(&self) -> ItemChartDataNode {
                ItemChartDataNode::default()
            }
        }

        let expected = json!({
            "testQuery": {
              "consumptionHistory": {
                "nodes": [
                  {
                    "amc": 75.0,
                    "consumption": 80,
                    "date": "2021-03-01"
                  },
                  {
                    "amc": 65.0,
                    "consumption": 60,
                    "date": "2021-04-01"
                  },
                  {
                    "amc": 80.0,
                    "consumption": 75,
                    "date": "2021-05-01"
                  },
                  {
                    "amc": 90.0,
                    "consumption": 100,
                    "date": "2021-06-01"
                  },
                  {
                    "amc": 85.0,
                    "consumption": 85,
                    "date": "2021-07-01"
                  },
                  {
                    "amc": 85.0,
                    "consumption": 80,
                    "date": "2021-08-01"
                  },
                  {
                    "amc": 80.0,
                    "consumption": 70,
                    "date": "2021-09-01"
                  },
                  {
                    "amc": 110.0,
                    "consumption": 130,
                    "date": "2021-10-01"
                  },
                  {
                    "amc": 95.0,
                    "consumption": 110,
                    "date": "2021-11-01"
                  },
                  {
                    "amc": 92.0,
                    "consumption": 85,
                    "date": "2021-12-01"
                  },
                  {
                    "amc": 95.0,
                    "consumption": 90,
                    "date": "2022-01-01"
                  },
                  {
                    "amc": 100.0,
                    "consumption": 100,
                    "date": "2022-02-01"
                  }
                ]
              },
              "stockEvolution": {
                "nodes": [
                  {
                    "date": "2021-01-11",
                    "historicStockOnHand": 16,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-12",
                    "historicStockOnHand": 12,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-13",
                    "historicStockOnHand": 11,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-14",
                    "historicStockOnHand": 8,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-15",
                    "historicStockOnHand": 5,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-16",
                    "historicStockOnHand": 3,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-17",
                    "historicStockOnHand": 0,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-18",
                    "historicStockOnHand": 0,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-19",
                    "historicStockOnHand": 0,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-20",
                    "historicStockOnHand": 0,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-21",
                    "historicStockOnHand": 48,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-22",
                    "historicStockOnHand": 46,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-23",
                    "historicStockOnHand": 45,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-24",
                    "historicStockOnHand": 40,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-25",
                    "historicStockOnHand": 39,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-26",
                    "historicStockOnHand": 39,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-27",
                    "historicStockOnHand": 37,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-28",
                    "historicStockOnHand": 32,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-29",
                    "historicStockOnHand": 30,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-30",
                    "historicStockOnHand": 29,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-01-31",
                    "historicStockOnHand": 24,
                    "projectedStockOnHand": null
                  },
                  {
                    "date": "2021-02-02",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 20
                  },
                  {
                    "date": "2021-02-03",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 17
                  },
                  {
                    "date": "2021-02-04",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 14
                  },
                  {
                    "date": "2021-02-05",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 11
                  },
                  {
                    "date": "2021-02-06",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 8
                  },
                  {
                    "date": "2021-02-07",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 5
                  },
                  {
                    "date": "2021-02-08",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 2
                  },
                  {
                    "date": "2021-02-09",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 0
                  },
                  {
                    "date": "2021-02-10",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 0
                  },
                  {
                    "date": "2021-02-11",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 180
                  },
                  {
                    "date": "2021-02-12",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 177
                  },
                  {
                    "date": "2021-02-13",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 174
                  },
                  {
                    "date": "2021-02-14",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 171
                  },
                  {
                    "date": "2021-02-15",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 168
                  },
                  {
                    "date": "2021-02-16",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 165
                  },
                  {
                    "date": "2021-02-17",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 162
                  },
                  {
                    "date": "2021-02-18",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 159
                  },
                  {
                    "date": "2021-02-19",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 156
                  },
                  {
                    "date": "2021-02-20",
                    "historicStockOnHand": null,
                    "projectedStockOnHand": 153
                  }
                ]
              },
              "suggestedQuantityCalculation": {
                "averageMonthlyConsumption": 100.0,
                "maximumStockOnHand": 200,
                "minimumStockOnHand": 30,
                "stockOnHand": 20,
                "suggested": 180
              }
            }
          }
        );

        let query = r#"
        query {
            testQuery {
                consumptionHistory {
                    nodes {
                        consumption
                        amc
                        date
                    }
                }
                stockEvolution {
                    nodes {
                        projectedStockOnHand
                        historicStockOnHand
                        date
                    }
                }
                suggestedQuantityCalculation {
                    averageMonthlyConsumption
                    stockOnHand
                    minimumStockOnHand
                    maximumStockOnHand
                    suggested
                }
            }
        }
        "#;

        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
}
