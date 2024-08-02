use crate::{
    migrations::{sql, DATE, DOUBLE},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
          CREATE TYPE rn_r_form_status AS ENUM (
            'DRAFT',
            'FINALISED'
          );
        "#
    )?;

    const RNR_FORM_STATUS_ENUM_TYPE: &str = if cfg!(feature = "postgres") {
        "rn_r_form_status"
    } else {
        "TEXT"
    };

    sql!(
        connection,
        r#"
           CREATE TABLE rnr_form (
                id TEXT NOT NULL PRIMARY KEY,
                store_id TEXT NOT NULL REFERENCES store(id),
                name_link_id TEXT NOT NULL REFERENCES name_link(id),
                period_id TEXT NOT NULL REFERENCES period(id),
                program_id TEXT NOT NULL REFERENCES program(id),
                status {RNR_FORM_STATUS_ENUM_TYPE} NOT NULL,
                created_datetime TIMESTAMP NOT NULL,
                finalised_datetime TIMESTAMP,
                linked_requisition_id TEXT
            );

        "#
    )?;

    sql!(
        connection,
        r#"
           CREATE TABLE rnr_form_line (
                id TEXT NOT NULL PRIMARY KEY,
                rnr_form_id TEXT NOT NULL REFERENCES rnr_form(id),
                item_id TEXT NOT NULL REFERENCES item(id),
                average_monthly_consumption {DOUBLE} NOT NULL,
                previous_average_monthly_consumption {DOUBLE} NOT NULL,
                initial_balance {DOUBLE} NOT NULL,
                snapshot_quantity_received {DOUBLE} NOT NULL,
                snapshot_quantity_consumed {DOUBLE} NOT NULL,
                snapshot_adjustments {DOUBLE} NOT NULL,
                entered_quantity_received {DOUBLE},
                entered_quantity_consumed {DOUBLE},
                entered_adjustments {DOUBLE},
                adjusted_quantity_consumed {DOUBLE} NOT NULL,
                stock_out_duration INTEGER NOT NULL,
                final_balance {DOUBLE} NOT NULL,
                maximum_quantity {DOUBLE} NOT NULL,
                expiry_date {DATE},
                requested_quantity {DOUBLE} NOT NULL,
                comment TEXT,
                confirmed BOOLEAN NOT NULL DEFAULT FALSE
            );

        "#
    )?;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'RNR_FORM_QUERY';
            ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'RNR_FORM_MUTATE';

            ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'rnr_form';
            ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'rnr_form_line';

            ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'RNR_FORM_CREATED';
            ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'RNR_FORM_UPDATED';
            ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'RNR_FORM_FINALISED';
        "#
    )?;

    Ok(())
}
