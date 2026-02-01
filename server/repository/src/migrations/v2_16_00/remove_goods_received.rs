use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_goods_received"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Update tables
        sql!(
            connection,
            r#"
                DROP TABLE goods_received_line;
                DROP TABLE goods_received;
                ALTER TABLE purchase_order_line DROP COLUMN received_number_of_units;
                ALTER TABLE invoice DROP COLUMN goods_received_id;
            "#
        )?;

        // Rename preferences
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE permission_type RENAME VALUE 'GOODS_RECEIVED_QUERY' TO 'INBOUND_SHIPMENT_EXTERNAL_QUERY';
                    ALTER TYPE permission_type RENAME VALUE 'GOODS_RECEIVED_MUTATE' TO 'INBOUND_SHIPMENT_EXTERNAL_MUTATE';
                    ALTER TYPE permission_type RENAME VALUE 'GOODS_RECEIVED_AUTHORISE' TO 'INBOUND_SHIPMENT_EXTERNAL_AUTHORISE';
                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                    UPDATE user_permission SET permission = 'INBOUND_SHIPMENT_EXTERNAL_QUERY' WHERE permission = 'GOODS_RECEIVED_QUERY';
                    UPDATE user_permission SET permission = 'INBOUND_SHIPMENT_EXTERNAL_MUTATE' WHERE permission = 'GOODS_RECEIVED_MUTATE';
                    UPDATE user_permission SET permission = 'INBOUND_SHIPMENT_EXTERNAL_AUTHORISE' WHERE permission = 'GOODS_RECEIVED_AUTHORISE';
                "#
            )?;
        }

        // Delete related entries
        sql!(
            connection,
            r#"
                DELETE FROM activity_log WHERE type IN (
                    'GOODS_RECEIVED_CREATED',
                    'GOODS_RECEIVED_DELETED',
                    'GOODS_RECEIVED_STATUS_FINALISED'
                );
                DELETE FROM number WHERE type = 'GOODS_RECEIVED' or type like 'GOODSRECEIVEDLINE_%';
                DELETE FROM changelog WHERE table_name IN (
                    'goods_received_line',
                    'goods_received'
                );
                DELETE FROM report WHERE context = 'GOODS_RECEIVED';
            "#
        )?;

        // Remove now unused enum variants
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    DROP TYPE goods_received_status;
                    DROP TYPE goods_received_line_status;
                "#
            )?;

            // Can't drop enum values directly, so recreate the enum without the unwanted values
            // sql!(
            //     connection,
            //     r#"
            //         ALTER TYPE activity_log_type DROP VALUE 'GOODS_RECEIVED_CREATED';
            //         ALTER TYPE activity_log_type DROP VALUE 'GOODS_RECEIVED_DELETED';
            //         ALTER TYPE activity_log_type DROP VALUE 'GOODS_RECEIVED_STATUS_FINALISED';
            //         ALTER TYPE number_type DROP VALUE 'GOODS_RECEIVED_LINE';
            //         ALTER TYPE number_type DROP VALUE 'GOODS_RECEIVED';
            //         ALTER TYPE changelog_table_name DROP VALUE 'goods_received_line';
            //         ALTER TYPE changelog_table_name DROP VALUE 'goods_received';
            //         ALTER TYPE context_type DROP VALUE 'GOODS_RECEIVED';
            //     "#
            // )?;
            sql!(
                connection,
                r#"
                    CREATE TYPE activity_log_type_new AS ENUM (
                        'USER_LOGGED_IN',
                        'INVOICE_CREATED',
                        'INVOICE_DELETED',
                        'INVOICE_STATUS_ALLOCATED',
                        'INVOICE_STATUS_PICKED',
                        'INVOICE_STATUS_SHIPPED',
                        'INVOICE_STATUS_DELIVERED',
                        'INVOICE_STATUS_VERIFIED',
                        'STOCKTAKE_CREATED',
                        'STOCKTAKE_DELETED',
                        'STOCKTAKE_STATUS_FINALISED',
                        'REQUISITION_CREATED',
                        'REQUISITION_DELETED',
                        'REQUISITION_STATUS_SENT',
                        'REQUISITION_STATUS_FINALISED',
                        'STOCK_LOCATION_CHANGE',
                        'STOCK_COST_PRICE_CHANGE',
                        'STOCK_SELL_PRICE_CHANGE',
                        'STOCK_EXPIRY_DATE_CHANGE',
                        'STOCK_BATCH_CHANGE',
                        'STOCK_ON_HOLD',
                        'STOCK_OFF_HOLD',
                        'INVOICE_NUMBER_ALLOCATED',
                        'REQUISITION_NUMBER_ALLOCATED',
                        'REPACK',
                        'PRESCRIPTION_CREATED',
                        'PRESCRIPTION_DELETED',
                        'PRESCRIPTION_STATUS_PICKED',
                        'PRESCRIPTION_STATUS_VERIFIED',
                        'PRESCRIPTION_STATUS_CANCELLED',
                        'SENSOR_LOCATION_CHANGED',
                        'ASSET_CATALOGUE_ITEM_CREATED',
                        'ASSET_LOG_REASON_CREATED',
                        'ASSET_LOG_REASON_DELETED',
                        'ASSET_CREATED',
                        'ASSET_UPDATED',
                        'ASSET_DELETED',
                        'ASSET_LOG_CREATED',
                        'ASSET_CATALOGUE_ITEM_PROPERTY_CREATED',
                        'QUANTITY_FOR_LINE_HAS_BEEN_SET_TO_ZERO',
                        'INVENTORY_ADJUSTMENT',
                        'ASSET_PROPERTY_CREATED',
                        'ASSET_PROPERTY_UPDATED',
                        'VACCINE_COURSE_CREATED',
                        'VACCINE_COURSE_UPDATED',
                        'PROGRAM_CREATED',
                        'PROGRAM_UPDATED',
                        'RNR_FORM_CREATED',
                        'RNR_FORM_UPDATED',
                        'RNR_FORM_FINALISED',
                        'REQUISITION_APPROVED',
                        'VACCINATION_CREATED',
                        'VACCINATION_UPDATED',
                        'VACCINATION_DELETED',
                        'DEMOGRAPHIC_INDICATOR_CREATED',
                        'DEMOGRAPHIC_INDICATOR_UPDATED',
                        'DEMOGRAPHIC_PROJECTION_CREATED',
                        'DEMOGRAPHIC_PROJECTION_UPDATED',
                        'ITEM_VARIANT_CREATED',
                        'ITEM_VARIANT_DELETED',
                        'ITEM_VARIANT_UPDATED_NAME',
                        'ITEM_VARIANT_UPDATE_LOCATION_TYPE',
                        'ITEM_VARIANT_UPDATE_MANUFACTURER',
                        'ITEM_VARIANT_UPDATE_DOSE_PER_UNIT',
                        'ITEM_VARIANT_UPDATE_VVM_TYPE',
                        'VVM_STATUS_LOG_UPDATED',
                        'INVOICE_STATUS_RECEIVED',
                        'RNR_FORM_DELETED',
                        'VOLUME_PER_PACK_CHANGED',
                        'PURCHASE_ORDER_CREATED',
                        'PURCHASE_ORDER_REQUEST_APPROVAL',
                        'PURCHASE_ORDER_UNAUTHORISED',
                        'PURCHASE_ORDER_CONFIRMED',
                        'PURCHASE_ORDER_FINALISED',
                        'PURCHASE_ORDER_DELETED',
                        'PURCHASE_ORDER_LINE_CREATED',
                        'PURCHASE_ORDER_LINE_UPDATED',
                        'PURCHASE_ORDER_LINE_DELETED',
                        'INVOICE_STATUS_CANCELLED',
                        'PATIENT_UPDATED',
                        'PATIENT_CREATED',
                        'PURCHASE_ORDER_SENT',
                        'PURCHASE_ORDER_STATUS_CHANGED_FROM_SENT_TO_CONFIRMED',
                        'PURCHASE_ORDER_LINE_STATUS_CHANGED_FROM_SENT_TO_NEW',
                        'PURCHASE_ORDER_LINE_STATUS_CLOSED');
                    ALTER TABLE activity_log
                        ALTER COLUMN type TYPE activity_log_type_new
                        USING type::text::activity_log_type_new;
                    DROP TYPE activity_log_type;
                    ALTER TYPE activity_log_type_new RENAME TO activity_log_type;
                "#
            )?;
            sql!(
                connection,
                r#"
                    DROP TYPE number_type; -- Not used any more as now a string is used
                "#
            )?;
            sql!(
                connection,
                r#"
                    CREATE TYPE changelog_table_name_new AS ENUM (
                        'number',
                        'location',
                        'stock_line',
                        'name',
                        'name_store_join',
                        'invoice',
                        'invoice_line',
                        'stocktake',
                        'stocktake_line',
                        'requisition',
                        'requisition_line',
                        'activity_log',
                        'clinician',
                        'clinician_store_join',
                        'document',
                        'barcode',
                        'location_movement',
                        'sensor',
                        'temperature_breach',
                        'temperature_log',
                        'temperature_breach_config',
                        'currency',
                        'asset_catalogue_item_property',
                        'asset_catalogue_property',
                        'asset_log_reason',
                        'asset',
                        'asset_log',
                        'asset_class',
                        'asset_category',
                        'asset_catalogue_type',
                        'asset_catalogue_item',
                        'pack_variant',
                        'sync_file_reference',
                        'asset_property',
                        'property',
                        'name_property',
                        'name_oms_fields',
                        'asset_internal_location',
                        'rnr_form',
                        'rnr_form_line',
                        'demographic_indicator',
                        'vaccine_course',
                        'vaccine_course_dose',
                        'vaccine_course_item',
                        'vaccination',
                        'demographic',
                        'item_variant',
                        'packaging_variant',
                        'indicator_value',
                        'bundled_item',
                        'item',
                        'system_log',
                        'contact_form',
                        'backend_plugin',
                        'insurance_provider',
                        'frontend_plugin',
                        'name_insurance_join',
                        'report',
                        'form_schema',
                        'plugin_data',
                        'preference',
                        'sync_message',
                        'vvm_status_log',
                        'campaign',
                        'purchase_order',
                        'purchase_order_line',
                        'master_list',
                        'encounter');
                    ALTER TABLE changelog
                        ALTER COLUMN table_name TYPE changelog_table_name_new
                        USING table_name::text::changelog_table_name_new;
                    DROP TYPE changelog_table_name;
                    ALTER TYPE changelog_table_name_new RENAME TO changelog_table_name;
                "#
            )?;
            sql!(
                connection,
                r#"
                    CREATE TYPE context_type_new AS ENUM (
                        'ASSET',
                        'INBOUND_SHIPMENT',
                        'OUTBOUND_SHIPMENT',
                        'REQUISITION',
                        'STOCKTAKE',
                        'RESOURCE',
                        'PATIENT',
                        'DISPENSARY',
                        'REPACK',
                        'CUSTOMER_RETURN',
                        'SUPPLIER_RETURN',
                        'REPORT',
                        'PRESCRIPTION',
                        'OUTBOUND_RETURN',
                        'INBOUND_RETURN',
                        'INTERNAL_ORDER',
                        'PURCHASE_ORDER');
                    ALTER TABLE report
                        ALTER COLUMN context TYPE context_type_new
                        USING context::text::context_type_new;
                    DROP TYPE context_type;
                    ALTER TYPE context_type_new RENAME TO context_type;
                "#
            )?;
        }

        Ok(())
    }
}
