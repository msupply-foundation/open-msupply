use async_graphql::*;
use chrono::NaiveDate;
use service::requisition_line::chart::{
    ConsumptionHistory, ItemChart, StockEvolution, SuggestedQuantityCalculation,
};
use util::last_day_of_the_month;

pub struct ConsumptionHistoryNode {
    pub consumption_history: ConsumptionHistory,
    pub reference_date: NaiveDate,
}
pub struct StockEvolutionNode {
    pub stock_evolution: StockEvolution,
    pub reference_date: NaiveDate,
    pub minimum_stock_on_hand: u32,
    pub maximum_stock_on_hand: u32,
}
pub struct SuggestedQuantityCalculationNode {
    pub suggested_quantity_calculation: SuggestedQuantityCalculation,
}

#[derive(SimpleObject)]
pub struct ConsumptionHistoryConnector {
    total_count: u32,
    nodes: Vec<ConsumptionHistoryNode>,
}

#[derive(SimpleObject)]
pub struct StockEvolutionConnector {
    total_count: u32,
    nodes: Vec<StockEvolutionNode>,
}

#[derive(SimpleObject)]
pub struct ItemChartNode {
    pub consumption_history: Option<ConsumptionHistoryConnector>,
    pub stock_evolution: Option<StockEvolutionConnector>,
    pub suggested_quantity_calculation: SuggestedQuantityCalculationNode,
    pub calculation_date: Option<NaiveDate>,
}

#[Object]
impl ConsumptionHistoryNode {
    pub async fn date(&self) -> &NaiveDate {
        &self.consumption_history.date
    }

    pub async fn consumption(&self) -> u32 {
        self.consumption_history.consumption
    }

    pub async fn average_monthly_consumption(&self) -> u32 {
        self.consumption_history.average_monthly_consumption as u32
    }

    pub async fn is_historic(&self) -> bool {
        self.reference_date > self.consumption_history.date
    }

    // the reference date is the current date; the consumption_history date
    // is always the last day of the month
    pub async fn is_current(&self) -> bool {
        last_day_of_the_month(&self.reference_date) == self.consumption_history.date
    }
}

#[Object]
impl SuggestedQuantityCalculationNode {
    pub async fn average_monthly_consumption(&self) -> u32 {
        self.suggested_quantity_calculation
            .average_monthly_consumption as u32
    }

    pub async fn stock_on_hand(&self) -> u32 {
        self.suggested_quantity_calculation.stock_on_hand
    }

    pub async fn minimum_stock_on_hand(&self) -> u32 {
        self.suggested_quantity_calculation.minimum_stock_on_hand as u32
    }

    pub async fn maximum_stock_on_hand(&self) -> u32 {
        self.suggested_quantity_calculation.maximum_stock_on_hand as u32
    }

    pub async fn suggested_quantity(&self) -> u32 {
        self.suggested_quantity_calculation.suggested
    }
}

#[Object]
impl StockEvolutionNode {
    pub async fn date(&self) -> &NaiveDate {
        &self.stock_evolution.date
    }

    pub async fn stock_on_hand(&self) -> u32 {
        self.stock_evolution.quantity as u32
    }

    pub async fn is_historic(&self) -> bool {
        self.reference_date >= self.stock_evolution.date
    }

    pub async fn is_projected(&self) -> bool {
        self.reference_date < self.stock_evolution.date
    }

    pub async fn minimum_stock_on_hand(&self) -> u32 {
        self.minimum_stock_on_hand
    }

    pub async fn maximum_stock_on_hand(&self) -> u32 {
        self.maximum_stock_on_hand
    }
}

impl ItemChartNode {
    pub fn from_domain(
        ItemChart {
            consumption_history,
            stock_evolution,
            reference_date,
            suggested_quantity_calculation,
        }: ItemChart,
    ) -> Self {
        let reference_date = match reference_date {
            Some(reference_date) => reference_date,
            _ => {
                return ItemChartNode {
                    suggested_quantity_calculation: SuggestedQuantityCalculationNode {
                        suggested_quantity_calculation,
                    },
                    consumption_history: None,
                    stock_evolution: None,
                    calculation_date: None,
                }
            }
        };

        ItemChartNode {
            consumption_history: consumption_history.map(|rows| ConsumptionHistoryConnector {
                total_count: rows.len() as u32,
                nodes: rows
                    .into_iter()
                    .map(|consumption_history| ConsumptionHistoryNode {
                        consumption_history,
                        reference_date,
                    })
                    .collect(),
            }),
            stock_evolution: stock_evolution.map(|rows| StockEvolutionConnector {
                total_count: rows.len() as u32,
                nodes: rows
                    .into_iter()
                    .map(|stock_evolution| StockEvolutionNode {
                        stock_evolution,
                        reference_date,
                        minimum_stock_on_hand: suggested_quantity_calculation.minimum_stock_on_hand
                            as u32,
                        maximum_stock_on_hand: suggested_quantity_calculation.maximum_stock_on_hand
                            as u32,
                    })
                    .collect(),
            }),
            calculation_date: Some(reference_date),
            suggested_quantity_calculation: SuggestedQuantityCalculationNode {
                suggested_quantity_calculation,
            },
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::Object;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;

    use super::*;

    #[actix_rt::test]
    async fn graphql_test_item_chart_node() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphl_test(
            TestQuery,
            EmptyMutation,
            "graphql_test_item_chart_node",
            MockDataInserts::none(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query(&self) -> ItemChartNode {
                ItemChartNode::from_domain(ItemChart {
                    consumption_history: Some(vec![
                        ConsumptionHistory {
                            consumption: 10,
                            average_monthly_consumption: 11.0,
                            date: NaiveDate::from_ymd_opt(2020, 12, 31).unwrap(),
                        },
                        ConsumptionHistory {
                            consumption: 10,
                            average_monthly_consumption: 11.0,
                            date: NaiveDate::from_ymd_opt(2021, 01, 31).unwrap(),
                        },
                    ]),
                    stock_evolution: Some(vec![
                        StockEvolution {
                            quantity: 30.5,
                            date: NaiveDate::from_ymd_opt(2021, 01, 01).unwrap(),
                        },
                        StockEvolution {
                            quantity: 32.5,
                            date: NaiveDate::from_ymd_opt(2021, 01, 02).unwrap(),
                        },
                    ]),
                    reference_date: Some(NaiveDate::from_ymd_opt(2021, 01, 01).unwrap()),
                    suggested_quantity_calculation: SuggestedQuantityCalculation {
                        average_monthly_consumption: 10.5,
                        stock_on_hand: 10,
                        minimum_stock_on_hand: 100.0,
                        maximum_stock_on_hand: 200.0,
                        suggested: 150,
                    },
                })
            }
        }

        let query = r#"
        query {
            testQuery {
                __typename
                consumptionHistory {
                    nodes {
                        consumption
                        averageMonthlyConsumption
                        date
                        isHistoric
                        isCurrent
                    }
                }
                stockEvolution {
                    nodes {
                        stockOnHand
                        date
                        minimumStockOnHand
                        maximumStockOnHand
                        isHistoric
                        isProjected
                    }
                }
                suggestedQuantityCalculation {
                    averageMonthlyConsumption
                    minimumStockOnHand
                    maximumStockOnHand
                    suggestedQuantity

                }
               calculationDate
            }
        }
        "#;

        let expected = json!({
            "testQuery": {
              "__typename": "ItemChartNode",
              "calculationDate": "2021-01-01",
              "consumptionHistory": {
                "nodes": [
                  {
                    "averageMonthlyConsumption": 11,
                    "consumption": 10,
                    "date": "2020-12-31",
                    "isCurrent": false,
                    "isHistoric": true
                  },
                  {
                    "averageMonthlyConsumption": 11,
                    "consumption": 10,
                    "date": "2021-01-31",
                    "isCurrent": true,
                    "isHistoric": false
                  }
                ]
              },
              "stockEvolution": {
                "nodes": [
                  {
                    "date": "2021-01-01",
                    "isHistoric": true,
                    "isProjected": false,
                    "maximumStockOnHand": 200,
                    "minimumStockOnHand": 100,
                    "stockOnHand": 30
                  },
                  {
                    "date": "2021-01-02",
                    "isHistoric": false,
                    "isProjected": true,
                    "maximumStockOnHand": 200,
                    "minimumStockOnHand": 100,
                    "stockOnHand": 32
                  }
                ]
              },
              "suggestedQuantityCalculation": {
                "averageMonthlyConsumption": 10,
                "maximumStockOnHand": 200,
                "minimumStockOnHand": 100,
                "suggestedQuantity": 150
              }
            }
          }
        );

        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
}
