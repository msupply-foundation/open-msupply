use async_graphql::*;
use chrono::NaiveDate;

#[derive(SimpleObject)]
pub struct ConsumptionHistoryNode {
    pub consumption: u32,
    pub amc: f64,
    pub is_historic: bool,
    pub date: NaiveDate,
}

#[derive(SimpleObject)]
pub struct ConsumptionHistoryConnector {
    total_count: u32,
    nodes: Vec<ConsumptionHistoryNode>,
}

#[derive(SimpleObject, Clone)]
pub struct StockEvolutionNode {
    pub stock_on_hand: u32,
    pub is_historic: bool,
    pub max: u32,
    pub min: u32,
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
                is_historic: false,
                amc: 100.0,
                date: NaiveDate::from_ymd(2022, 02, 01),
            },
            ConsumptionHistoryNode {
                consumption: 90,
                is_historic: true,
                amc: 95.0,
                date: NaiveDate::from_ymd(2022, 01, 01),
            },
            ConsumptionHistoryNode {
                consumption: 85,
                is_historic: true,
                amc: 92.0,
                date: NaiveDate::from_ymd(2021, 12, 01),
            },
            ConsumptionHistoryNode {
                consumption: 110,
                is_historic: true,
                amc: 95.0,
                date: NaiveDate::from_ymd(2021, 11, 01),
            },
            ConsumptionHistoryNode {
                consumption: 130,
                is_historic: true,
                amc: 110.0,
                date: NaiveDate::from_ymd(2021, 10, 01),
            },
            ConsumptionHistoryNode {
                consumption: 70,
                is_historic: true,
                amc: 80.0,
                date: NaiveDate::from_ymd(2021, 09, 01),
            },
            ConsumptionHistoryNode {
                consumption: 80,
                is_historic: true,
                amc: 85.0,
                date: NaiveDate::from_ymd(2021, 08, 01),
            },
            ConsumptionHistoryNode {
                consumption: 85,
                is_historic: true,
                amc: 85.0,
                date: NaiveDate::from_ymd(2021, 07, 01),
            },
            ConsumptionHistoryNode {
                consumption: 100,
                is_historic: true,
                amc: 90.0,
                date: NaiveDate::from_ymd(2021, 06, 01),
            },
            ConsumptionHistoryNode {
                consumption: 75,
                is_historic: true,
                amc: 80.0,
                date: NaiveDate::from_ymd(2021, 05, 01),
            },
            ConsumptionHistoryNode {
                consumption: 60,
                is_historic: true,
                amc: 65.0,
                date: NaiveDate::from_ymd(2021, 04, 01),
            },
            ConsumptionHistoryNode {
                consumption: 80,
                is_historic: true,
                amc: 75.0,
                date: NaiveDate::from_ymd(2021, 03, 01),
            },
        ];
        consumption_history.sort_by(|a, b| a.date.cmp(&b.date));
        let mut stock_evolution = vec![
            // After receiving
            StockEvolutionNode {
                stock_on_hand: 180,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 11),
            },
            StockEvolutionNode {
                stock_on_hand: 177,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 12),
            },
            StockEvolutionNode {
                stock_on_hand: 174,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 13),
            },
            StockEvolutionNode {
                stock_on_hand: 171,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 14),
            },
            StockEvolutionNode {
                stock_on_hand: 168,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 15),
            },
            StockEvolutionNode {
                stock_on_hand: 165,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 16),
            },
            StockEvolutionNode {
                stock_on_hand: 162,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 17),
            },
            StockEvolutionNode {
                stock_on_hand: 159,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 18),
            },
            StockEvolutionNode {
                stock_on_hand: 156,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 19),
            },
            StockEvolutionNode {
                stock_on_hand: 153,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 20),
            },
            // Before receiving
            StockEvolutionNode {
                stock_on_hand: 20,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 02),
            },
            StockEvolutionNode {
                stock_on_hand: 17,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 03),
            },
            StockEvolutionNode {
                stock_on_hand: 14,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 04),
            },
            StockEvolutionNode {
                stock_on_hand: 11,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 05),
            },
            StockEvolutionNode {
                stock_on_hand: 8,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 06),
            },
            StockEvolutionNode {
                stock_on_hand: 5,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 07),
            },
            StockEvolutionNode {
                stock_on_hand: 2,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 08),
            },
            StockEvolutionNode {
                stock_on_hand: 0,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 09),
            },
            StockEvolutionNode {
                stock_on_hand: 0,
                is_historic: true,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 02, 10),
            },
            // Historic after receiving
            StockEvolutionNode {
                stock_on_hand: 24,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 31),
            },
            StockEvolutionNode {
                stock_on_hand: 29,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 30),
            },
            StockEvolutionNode {
                stock_on_hand: 30,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 29),
            },
            StockEvolutionNode {
                stock_on_hand: 32,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 28),
            },
            StockEvolutionNode {
                stock_on_hand: 37,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 27),
            },
            StockEvolutionNode {
                stock_on_hand: 39,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 26),
            },
            StockEvolutionNode {
                stock_on_hand: 39,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 25),
            },
            StockEvolutionNode {
                stock_on_hand: 40,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 24),
            },
            StockEvolutionNode {
                stock_on_hand: 45,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 23),
            },
            StockEvolutionNode {
                stock_on_hand: 46,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 22),
            },
            StockEvolutionNode {
                stock_on_hand: 48,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 21),
            },
            // Historic Before Receiving
            StockEvolutionNode {
                stock_on_hand: 16,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 11),
            },
            StockEvolutionNode {
                stock_on_hand: 12,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 12),
            },
            StockEvolutionNode {
                stock_on_hand: 11,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 13),
            },
            StockEvolutionNode {
                stock_on_hand: 8,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 14),
            },
            StockEvolutionNode {
                stock_on_hand: 5,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 15),
            },
            StockEvolutionNode {
                stock_on_hand: 3,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 16),
            },
            StockEvolutionNode {
                stock_on_hand: 0,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 17),
            },
            StockEvolutionNode {
                stock_on_hand: 0,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 18),
            },
            StockEvolutionNode {
                stock_on_hand: 0,
                is_historic: false,
                max: 100,
                min: 30,
                date: NaiveDate::from_ymd(2021, 01, 19),
            },
            StockEvolutionNode {
                stock_on_hand: 0,
                is_historic: false,
                max: 100,
                min: 30,
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
                  "date": "2021-03-01",
                  "isHistoric": true
                },
                {
                  "amc": 65.0,
                  "consumption": 60,
                  "date": "2021-04-01",
                  "isHistoric": true
                },
                {
                  "amc": 80.0,
                  "consumption": 75,
                  "date": "2021-05-01",
                  "isHistoric": true
                },
                {
                  "amc": 90.0,
                  "consumption": 100,
                  "date": "2021-06-01",
                  "isHistoric": true
                },
                {
                  "amc": 85.0,
                  "consumption": 85,
                  "date": "2021-07-01",
                  "isHistoric": true
                },
                {
                  "amc": 85.0,
                  "consumption": 80,
                  "date": "2021-08-01",
                  "isHistoric": true
                },
                {
                  "amc": 80.0,
                  "consumption": 70,
                  "date": "2021-09-01",
                  "isHistoric": true
                },
                {
                  "amc": 110.0,
                  "consumption": 130,
                  "date": "2021-10-01",
                  "isHistoric": true
                },
                {
                  "amc": 95.0,
                  "consumption": 110,
                  "date": "2021-11-01",
                  "isHistoric": true
                },
                {
                  "amc": 92.0,
                  "consumption": 85,
                  "date": "2021-12-01",
                  "isHistoric": true
                },
                {
                  "amc": 95.0,
                  "consumption": 90,
                  "date": "2022-01-01",
                  "isHistoric": true
                },
                {
                  "amc": 100.0,
                  "consumption": 100,
                  "date": "2022-02-01",
                  "isHistoric": false
                }
              ]
            },
            "stockEvolution": {
              "nodes": [
                {
                  "date": "2021-01-11",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 16
                },
                {
                  "date": "2021-01-12",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 12
                },
                {
                  "date": "2021-01-13",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 11
                },
                {
                  "date": "2021-01-14",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 8
                },
                {
                  "date": "2021-01-15",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 5
                },
                {
                  "date": "2021-01-16",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 3
                },
                {
                  "date": "2021-01-17",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 0
                },
                {
                  "date": "2021-01-18",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 0
                },
                {
                  "date": "2021-01-19",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 0
                },
                {
                  "date": "2021-01-20",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 0
                },
                {
                  "date": "2021-01-21",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 48
                },
                {
                  "date": "2021-01-22",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 46
                },
                {
                  "date": "2021-01-23",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 45
                },
                {
                  "date": "2021-01-24",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 40
                },
                {
                  "date": "2021-01-25",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 39
                },
                {
                  "date": "2021-01-26",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 39
                },
                {
                  "date": "2021-01-27",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 37
                },
                {
                  "date": "2021-01-28",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 32
                },
                {
                  "date": "2021-01-29",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 30
                },
                {
                  "date": "2021-01-30",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 29
                },
                {
                  "date": "2021-01-31",
                  "isHistoric": false,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 24
                },
                {
                  "date": "2021-02-02",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 20
                },
                {
                  "date": "2021-02-03",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 17
                },
                {
                  "date": "2021-02-04",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 14
                },
                {
                  "date": "2021-02-05",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 11
                },
                {
                  "date": "2021-02-06",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 8
                },
                {
                  "date": "2021-02-07",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 5
                },
                {
                  "date": "2021-02-08",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 2
                },
                {
                  "date": "2021-02-09",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 0
                },
                {
                  "date": "2021-02-10",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 0
                },
                {
                  "date": "2021-02-11",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 180
                },
                {
                  "date": "2021-02-12",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 177
                },
                {
                  "date": "2021-02-13",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 174
                },
                {
                  "date": "2021-02-14",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 171
                },
                {
                  "date": "2021-02-15",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 168
                },
                {
                  "date": "2021-02-16",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 165
                },
                {
                  "date": "2021-02-17",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 162
                },
                {
                  "date": "2021-02-18",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 159
                },
                {
                  "date": "2021-02-19",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 156
                },
                {
                  "date": "2021-02-20",
                  "isHistoric": true,
                  "max": 100,
                  "min": 30,
                  "stockOnHand": 153
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
                        isHistoric
                        consumption
                        amc
                        date
                    }
                }
                stockEvolution {
                    nodes {
                        stockOnHand
                        isHistoric
                        max
                        min
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
