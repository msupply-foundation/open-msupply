use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_forecasting_fields_to_requisition_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE requisition_line ADD COLUMN forecast_total_units {DOUBLE};
                ALTER TABLE requisition_line ADD COLUMN forecast_total_doses {DOUBLE};
                ALTER TABLE requisition_line ADD COLUMN vaccine_courses TEXT;
            "#
        )?;

        // Migrate existing forecasting plugin data to the new columns
        #[cfg(not(feature = "postgres"))]
        sql!(
            connection,
            r#"
                UPDATE requisition_line 
                SET 
                    forecast_total_units = CASE 
                        WHEN json_extract(latest_plugin_data.data, '$.forecastTotalUnits') IS NOT NULL 
                        THEN CAST(json_extract(latest_plugin_data.data, '$.forecastTotalUnits') AS REAL)
                        ELSE NULL 
                    END,
                    forecast_total_doses = CASE 
                        WHEN json_extract(latest_plugin_data.data, '$.forecastTotalDoses') IS NOT NULL 
                        THEN CAST(json_extract(latest_plugin_data.data, '$.forecastTotalDoses') AS REAL)
                        ELSE NULL 
                    END,
                    vaccine_courses = json_extract(latest_plugin_data.data, '$.vaccineCourses')
                FROM (
                    SELECT pd.related_record_id, pd.data,
                           ROW_NUMBER() OVER (PARTITION BY pd.related_record_id ORDER BY pd.id DESC) as latest
                    FROM plugin_data pd
                    WHERE pd.plugin_code IN ('forecasting_plugins')
                ) latest_plugin_data
                WHERE latest_plugin_data.related_record_id = requisition_line.id 
                    AND latest_plugin_data.latest = 1;
            "#
        )?;

        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                UPDATE requisition_line 
                SET 
                    forecast_total_units = CASE 
                        WHEN (latest_plugin_data.data::json->>'forecastTotalUnits') IS NOT NULL 
                        THEN CAST((latest_plugin_data.data::json->>'forecastTotalUnits') AS DOUBLE PRECISION)
                        ELSE NULL 
                    END,
                    forecast_total_doses = CASE 
                        WHEN (latest_plugin_data.data::json->>'forecastTotalDoses') IS NOT NULL 
                        THEN CAST((latest_plugin_data.data::json->>'forecastTotalDoses') AS DOUBLE PRECISION)
                        ELSE NULL 
                    END,
                    vaccine_courses = (latest_plugin_data.data::json->>'vaccineCourses')
                FROM (
                    SELECT pd.related_record_id, pd.data,
                           ROW_NUMBER() OVER (PARTITION BY pd.related_record_id ORDER BY pd.id DESC) as latest
                    FROM plugin_data pd
                    WHERE pd.plugin_code IN ('forecasting_plugins')
                ) latest_plugin_data
                WHERE latest_plugin_data.related_record_id = requisition_line.id 
                    AND latest_plugin_data.latest = 1;
            "#
        )?;

        Ok(())
    }
}
