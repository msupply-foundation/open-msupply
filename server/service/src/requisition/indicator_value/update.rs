use repository::{
    indicator_column::{IndicatorColumnFilter, IndicatorColumnRepository},
    indicator_line::{IndicatorLineFilter, IndicatorLineRepository},
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    EqualFilter, IndicatorValueRow, IndicatorValueRowRepository, IndicatorValueType,
    RepositoryError, StorageConnection,
};

use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq, Clone, Default)]
pub struct UpdateIndicatorValue {
    pub id: String,
    pub value: String,
}

#[derive(Debug, PartialEq)]
pub enum UpdateIndicatorValueError {
    DatabaseError(RepositoryError),
    IndicatorValueDoesNotExist,
    NotThisStoreValue,
    ValueTypeNotCorrect,
    IndicatorLineDoesNotExist,
    IndicatorColumnDoesNotExist,
}

type OutError = UpdateIndicatorValueError;

pub fn update_indicator_value(
    ctx: &ServiceContext,
    input: UpdateIndicatorValue,
) -> Result<IndicatorValueRow, OutError> {
    let indicator_value = ctx
        .connection
        .transaction_sync(|connection| {
            let indicator_value_row = validate(connection, &input, ctx.store_id.clone())?;

            let updated_row = generate(indicator_value_row, input);

            IndicatorValueRowRepository::new(connection).upsert_one(&updated_row)?;

            IndicatorValueRepository::new(connection)
                .query_one(IndicatorValueFilter::new().id(EqualFilter::equal_to(&updated_row.id)))
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::IndicatorValueDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(indicator_value)
}

fn validate(
    connection: &StorageConnection,
    input: &UpdateIndicatorValue,
    store_id: String,
) -> Result<IndicatorValueRow, OutError> {
    let indicator_value_row = check_indicator_value_exists(connection, &input.id)?
        .ok_or(OutError::IndicatorValueDoesNotExist)?;

    if store_id != indicator_value_row.store_id {
        return Err(OutError::NotThisStoreValue);
    }

    let indicator_line = IndicatorLineRepository::new(connection)
        .query_by_filter(IndicatorLineFilter::new().id(EqualFilter::equal_to(
            &indicator_value_row.indicator_line_id,
        )))?
        .pop()
        .ok_or(OutError::IndicatorLineDoesNotExist)?;

    let indicator_column = IndicatorColumnRepository::new(connection)
        .query_by_filter(IndicatorColumnFilter::new().id(EqualFilter::equal_to(
            &indicator_value_row.indicator_column_id,
        )))?
        .pop()
        .ok_or(OutError::IndicatorColumnDoesNotExist)?;

    if let Some(column_value_type) = indicator_column.value_type {
        if column_value_type == IndicatorValueType::Number {
            match input.value.parse::<f64>() {
                Ok(_) => {}
                Err(_) => return Err(OutError::ValueTypeNotCorrect),
            }
        }
    } else if let Some(line_value_type) = indicator_line.value_type {
        if line_value_type == IndicatorValueType::Number {
            match input.value.parse::<f64>() {
                Ok(_) => {}
                Err(_) => return Err(OutError::ValueTypeNotCorrect),
            }
        }
    }

    Ok(indicator_value_row)
}

fn check_indicator_value_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<IndicatorValueRow>, RepositoryError> {
    IndicatorValueRepository::new(connection)
        .query_one(IndicatorValueFilter::new().id(EqualFilter::equal_to(id)))
}

fn generate(
    indicator_value_row: IndicatorValueRow,
    input: UpdateIndicatorValue,
) -> IndicatorValueRow {
    IndicatorValueRow {
        id: indicator_value_row.id,
        customer_name_link_id: indicator_value_row.customer_name_link_id,
        store_id: indicator_value_row.store_id,
        period_id: indicator_value_row.period_id,
        indicator_line_id: indicator_value_row.indicator_line_id,
        indicator_column_id: indicator_value_row.indicator_column_id,
        value: input.value,
    }
}

impl From<RepositoryError> for UpdateIndicatorValueError {
    fn from(error: RepositoryError) -> Self {
        UpdateIndicatorValueError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use crate::{
        requisition::indicator_value::{UpdateIndicatorValue, UpdateIndicatorValueError},
        service_provider::ServiceProvider,
    };
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_indicator_column_a, mock_indicator_line_c, mock_indicator_value_a,
            mock_name_store_b, mock_period, mock_store_a, mock_store_b, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        IndicatorValueRow, RequisitionRow, RequisitionStatus, RequisitionType,
    };
    use util::inline_init;

    fn response_program_req() -> RequisitionRow {
        inline_init(|r: &mut RequisitionRow| {
            r.id = "response_program_req".to_string();
            r.requisition_number = 3;
            r.name_link_id = mock_name_store_b().id;
            r.store_id = mock_store_a().id;
            r.r#type = RequisitionType::Response;
            r.status = RequisitionStatus::New;
            r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap();
            r.max_months_of_stock = 1.0;
            r.min_months_of_stock = 0.9;
            r.period_id = Some(mock_period().id);
        })
    }

    fn test_indicator_value() -> IndicatorValueRow {
        IndicatorValueRow {
            id: "test_indicator_value".to_string(),
            customer_name_link_id: mock_name_store_b().id,
            store_id: mock_store_a().id,
            period_id: mock_period().id,
            indicator_line_id: mock_indicator_line_c().id,
            indicator_column_id: mock_indicator_column_a().id,
            value: "2".to_string(),
        }
    }

    #[actix_rt::test]
    async fn update_indicator_value_errors() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_indicator_value_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.requisitions = vec![response_program_req()];
                r.indicator_values = vec![test_indicator_value()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.indicator_value_service;

        // IndicatorValueDoesNotExist
        assert_eq!(
            service.update_indicator_value(
                &context,
                inline_init(|r: &mut UpdateIndicatorValue| {
                    r.id = "invalid_id".to_string();
                    r.value = "new_value".to_string();
                }),
            ),
            Err(UpdateIndicatorValueError::IndicatorValueDoesNotExist)
        );

        // ValueNotCorrectType
        assert_eq!(
            service.update_indicator_value(
                &context,
                inline_init(|r: &mut UpdateIndicatorValue| {
                    r.id = test_indicator_value().id;
                    r.value = "new value".to_string();
                }),
            ),
            Err(UpdateIndicatorValueError::ValueTypeNotCorrect)
        );

        context.store_id = mock_store_b().id;
        // NotThisStoreValue
        assert_eq!(
            service.update_indicator_value(
                &context,
                inline_init(|r: &mut UpdateIndicatorValue| {
                    r.id = mock_indicator_value_a().id;
                    r.value = "new value".to_string();
                }),
            ),
            Err(UpdateIndicatorValueError::NotThisStoreValue)
        );
    }

    #[actix_rt::test]
    async fn update_indicator_value_success() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_indicator_value_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.requisitions = vec![response_program_req()];
                r.indicator_values = vec![test_indicator_value()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.indicator_value_service;

        service
            .update_indicator_value(
                &context,
                UpdateIndicatorValue {
                    id: test_indicator_value().id,
                    value: "6".to_string(),
                },
            )
            .unwrap();
    }
}
