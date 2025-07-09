// @generated automatically by Diesel CLI.

// pub mod sql_types {
//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "activity_log_type"))]
//     pub struct ActivityLogType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "approval_status_type"))]
//     pub struct ApprovalStatusType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "asset_log_status"))]
//     pub struct AssetLogStatus;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "changelog_table_name"))]
//     pub struct ChangelogTableName;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "contact_type_enum"))]
//     pub struct ContactTypeEnum;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "context_type"))]
//     pub struct ContextType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "document_registry_category"))]
//     pub struct DocumentRegistryCategory;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "document_status"))]
//     pub struct DocumentStatus;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "email_queue_status_enum"))]
//     pub struct EmailQueueStatusEnum;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "encounter_status"))]
//     pub struct EncounterStatus;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "gender_type"))]
//     pub struct GenderType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "indicator_value_type"))]
//     pub struct IndicatorValueType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "insurance_policy_type"))]
//     pub struct InsurancePolicyType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "invoice_line_type"))]
//     pub struct InvoiceLineType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "invoice_status"))]
//     pub struct InvoiceStatus;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "invoice_type"))]
//     pub struct InvoiceType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "item_type"))]
//     pub struct ItemType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "key_type"))]
//     pub struct KeyType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "language_type"))]
//     pub struct LanguageType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "name_type"))]
//     pub struct NameType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "permission_type"))]
//     pub struct PermissionType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "plugin_variant_type"))]
//     pub struct PluginVariantType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "property_value_type"))]
//     pub struct PropertyValueType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "purchase_order_status"))]
//     pub struct PurchaseOrderStatus;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "reason_option_type"))]
//     pub struct ReasonOptionType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "requisition_status"))]
//     pub struct RequisitionStatus;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "requisition_type"))]
//     pub struct RequisitionType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "rn_r_form_low_stock"))]
//     pub struct RnRFormLowStock;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "rn_r_form_status"))]
//     pub struct RnRFormStatus;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "row_action_type"))]
//     pub struct RowActionType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "sensor_type"))]
//     pub struct SensorType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "stocktake_status"))]
//     pub struct StocktakeStatus;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "store_mode"))]
//     pub struct StoreMode;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "store_preference_type"))]
//     pub struct StorePreferenceType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "sync_action"))]
//     pub struct SyncAction;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "sync_api_error_code"))]
//     pub struct SyncApiErrorCode;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "sync_file_direction"))]
//     pub struct SyncFileDirection;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "sync_file_status"))]
//     pub struct SyncFileStatus;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "sync_message_status"))]
//     pub struct SyncMessageStatus;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "system_log_type"))]
//     pub struct SystemLogType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "temperature_breach_type"))]
//     pub struct TemperatureBreachType;

//     #[derive(diesel::sql_types::SqlType)]
//     #[diesel(postgres_type(name = "ven_category"))]
//     pub struct VenCategory;
// }

diesel::table! {
    abbreviation (id) {
        id -> Text,
        text -> Text,
        expansion -> Text,
    }
}

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::ActivityLogType;

//     activity_log (id) {
//         id -> Text,
//         #[sql_name = "type"]
//         type_ -> Nullable<ActivityLogType>,
//         user_id -> Nullable<Text>,
//         store_id -> Nullable<Text>,
//         record_id -> Nullable<Text>,
//         datetime -> Timestamp,
//         changed_from -> Nullable<Text>,
//         changed_to -> Nullable<Text>,
//     }
// }

diesel::table! {
    asset (id) {
        id -> Text,
        store_id -> Nullable<Text>,
        notes -> Nullable<Text>,
        asset_number -> Nullable<Text>,
        serial_number -> Nullable<Text>,
        asset_catalogue_item_id -> Nullable<Text>,
        asset_category_id -> Nullable<Text>,
        asset_class_id -> Nullable<Text>,
        asset_catalogue_type_id -> Nullable<Text>,
        installation_date -> Nullable<Date>,
        replacement_date -> Nullable<Date>,
        deleted_datetime -> Nullable<Timestamp>,
        created_datetime -> Timestamp,
        modified_datetime -> Timestamp,
        properties -> Nullable<Text>,
        donor_name_id -> Nullable<Text>,
        warranty_start -> Nullable<Date>,
        warranty_end -> Nullable<Date>,
        needs_replacement -> Nullable<Bool>,
        locked_fields_json -> Nullable<Text>,
    }
}

// diesel::table! {
//     asset_catalogue_item (id) {
//         id -> Text,
//         code -> Text,
//         sub_catalogue -> Text,
//         asset_class_id -> Text,
//         asset_category_id -> Text,
//         asset_catalogue_type_id -> Text,
//         manufacturer -> Nullable<Text>,
//         model -> Text,
//         deleted_datetime -> Nullable<Timestamp>,
//         properties -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     asset_catalogue_type (id) {
//         id -> Text,
//         name -> Text,
//         asset_category_id -> Text,
//     }
// }

// diesel::table! {
//     asset_category (id) {
//         id -> Text,
//         name -> Text,
//         asset_class_id -> Text,
//     }
// }

// diesel::table! {
//     asset_class (id) {
//         id -> Text,
//         name -> Text,
//     }
// }

// diesel::table! {
//     asset_internal_location (id) {
//         id -> Text,
//         asset_id -> Text,
//         location_id -> Text,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::AssetLogStatus;

//     asset_log (id) {
//         id -> Text,
//         asset_id -> Text,
//         user_id -> Text,
//         status -> Nullable<AssetLogStatus>,
//         reason_id -> Nullable<Text>,
//         comment -> Nullable<Text>,
//         #[sql_name = "type"]
//         type_ -> Nullable<Text>,
//         log_datetime -> Timestamp,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::AssetLogStatus;

//     asset_log_reason (id) {
//         id -> Text,
//         reason -> Text,
//         deleted_datetime -> Nullable<Timestamp>,
//         asset_log_status -> AssetLogStatus,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::PropertyValueType;

//     asset_property (id) {
//         id -> Text,
//         key -> Text,
//         name -> Text,
//         asset_class_id -> Nullable<Text>,
//         asset_category_id -> Nullable<Text>,
//         asset_type_id -> Nullable<Text>,
//         value_type -> PropertyValueType,
//         allowed_values -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::PluginVariantType;

//     backend_plugin (id) {
//         id -> Text,
//         code -> Text,
//         bundle_base64 -> Text,
//         types -> Text,
//         variant_type -> PluginVariantType,
//     }
// }

// diesel::table! {
//     barcode (id) {
//         id -> Text,
//         gtin -> Text,
//         item_id -> Text,
//         pack_size -> Nullable<Float8>,
//         parent_id -> Nullable<Text>,
//         is_sync_update -> Bool,
//         manufacturer_link_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     bundled_item (id) {
//         id -> Text,
//         principal_item_variant_id -> Text,
//         bundled_item_variant_id -> Text,
//         ratio -> Float8,
//         deleted_datetime -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     campaign (id) {
//         id -> Text,
//         name -> Text,
//         start_date -> Nullable<Date>,
//         end_date -> Nullable<Date>,
//         deleted_datetime -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     category (id) {
//         id -> Text,
//         name -> Text,
//         description -> Nullable<Text>,
//         parent_id -> Nullable<Text>,
//         deleted_datetime -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::ChangelogTableName;
//     use super::sql_types::RowActionType;

//     changelog (cursor) {
//         cursor -> Int8,
//         table_name -> ChangelogTableName,
//         record_id -> Text,
//         row_action -> RowActionType,
//         name_link_id -> Nullable<Text>,
//         store_id -> Nullable<Text>,
//         is_sync_update -> Bool,
//         source_site_id -> Nullable<Int4>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::GenderType;

//     clinician (id) {
//         id -> Text,
//         code -> Text,
//         last_name -> Text,
//         initials -> Text,
//         first_name -> Nullable<Text>,
//         address1 -> Nullable<Text>,
//         address2 -> Nullable<Text>,
//         phone -> Nullable<Text>,
//         mobile -> Nullable<Text>,
//         email -> Nullable<Text>,
//         gender -> Nullable<GenderType>,
//         is_active -> Bool,
//         is_sync_update -> Bool,
//         store_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     clinician_link (id) {
//         id -> Text,
//         clinician_id -> Text,
//     }
// }

// diesel::table! {
//     clinician_store_join (id) {
//         id -> Text,
//         store_id -> Text,
//         is_sync_update -> Bool,
//         clinician_link_id -> Text,
//     }
// }

// diesel::table! {
//     cold_storage_type (id) {
//         id -> Text,
//         name -> Text,
//         min_temperature -> Nullable<Float8>,
//         max_temperature -> Nullable<Float8>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::ContactTypeEnum;

//     contact_form (id) {
//         id -> Text,
//         reply_email -> Text,
//         body -> Text,
//         created_datetime -> Timestamp,
//         user_id -> Text,
//         store_id -> Text,
//         contact_type -> ContactTypeEnum,
//         username -> Text,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::GenderType;

//     contact_trace (id) {
//         id -> Text,
//         program_id -> Text,
//         document_id -> Text,
//         datetime -> Nullable<Timestamp>,
//         contact_trace_id -> Nullable<Text>,
//         first_name -> Nullable<Text>,
//         last_name -> Nullable<Text>,
//         gender -> Nullable<GenderType>,
//         date_of_birth -> Nullable<Timestamp>,
//         store_id -> Nullable<Text>,
//         relationship -> Nullable<Text>,
//         patient_link_id -> Text,
//         contact_patient_link_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     context (id) {
//         id -> Text,
//         name -> Text,
//     }
// }

// diesel::table! {
//     currency (id) {
//         id -> Text,
//         rate -> Float8,
//         code -> Text,
//         is_home_currency -> Bool,
//         date_updated -> Nullable<Date>,
//         is_active -> Bool,
//     }
// }

// diesel::table! {
//     demographic (id) {
//         id -> Text,
//         name -> Text,
//         population_percentage -> Float8,
//     }
// }

// diesel::table! {
//     demographic_indicator (id) {
//         id -> Text,
//         name -> Text,
//         base_year -> Int4,
//         base_population -> Nullable<Int4>,
//         population_percentage -> Float8,
//         year_1_projection -> Int4,
//         year_2_projection -> Int4,
//         year_3_projection -> Int4,
//         year_4_projection -> Int4,
//         year_5_projection -> Int4,
//         demographic_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     demographic_projection (id) {
//         id -> Text,
//         base_year -> Int4,
//         year_1 -> Float8,
//         year_2 -> Float8,
//         year_3 -> Float8,
//         year_4 -> Float8,
//         year_5 -> Float8,
//     }
// }

// diesel::table! {
//     diagnosis (id) {
//         id -> Text,
//         code -> Text,
//         description -> Text,
//         notes -> Nullable<Text>,
//         valid_till -> Nullable<Date>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::DocumentStatus;

//     document (id) {
//         id -> Text,
//         name -> Text,
//         parent_ids -> Text,
//         user_id -> Text,
//         datetime -> Timestamp,
//         #[sql_name = "type"]
//         type_ -> Text,
//         data -> Text,
//         form_schema_id -> Nullable<Text>,
//         status -> DocumentStatus,
//         is_sync_update -> Bool,
//         context_id -> Text,
//         owner_name_link_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::DocumentRegistryCategory;

//     document_registry (id) {
//         id -> Text,
//         category -> DocumentRegistryCategory,
//         document_type -> Text,
//         context_id -> Text,
//         name -> Nullable<Text>,
//         form_schema_id -> Nullable<Text>,
//         config -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::EmailQueueStatusEnum;

//     email_queue (id) {
//         id -> Text,
//         to_address -> Text,
//         subject -> Text,
//         html_body -> Text,
//         text_body -> Text,
//         status -> EmailQueueStatusEnum,
//         created_at -> Timestamp,
//         updated_at -> Timestamp,
//         sent_at -> Nullable<Timestamp>,
//         retries -> Int4,
//         error -> Nullable<Text>,
//         retry_at -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::EncounterStatus;

//     encounter (id) {
//         id -> Text,
//         document_name -> Text,
//         created_datetime -> Timestamp,
//         start_datetime -> Timestamp,
//         end_datetime -> Nullable<Timestamp>,
//         status -> Nullable<EncounterStatus>,
//         store_id -> Nullable<Text>,
//         document_type -> Text,
//         program_id -> Text,
//         patient_link_id -> Text,
//         clinician_link_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     form_schema (id) {
//         id -> Text,
//         #[sql_name = "type"]
//         type_ -> Text,
//         json_schema -> Text,
//         ui_schema -> Text,
//     }
// }

// diesel::table! {
//     frontend_plugin (id) {
//         id -> Text,
//         code -> Text,
//         entry_point -> Text,
//         types -> Text,
//         files -> Text,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::IndicatorValueType;

//     indicator_column (id) {
//         id -> Text,
//         program_indicator_id -> Text,
//         column_number -> Int4,
//         header -> Text,
//         value_type -> Nullable<IndicatorValueType>,
//         default_value -> Text,
//         is_active -> Bool,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::IndicatorValueType;

//     indicator_line (id) {
//         id -> Text,
//         program_indicator_id -> Text,
//         line_number -> Int4,
//         description -> Text,
//         code -> Text,
//         value_type -> Nullable<IndicatorValueType>,
//         default_value -> Text,
//         is_required -> Bool,
//         is_active -> Bool,
//     }
// }

// diesel::table! {
//     indicator_value (id) {
//         id -> Text,
//         customer_name_link_id -> Text,
//         store_id -> Text,
//         period_id -> Text,
//         indicator_line_id -> Text,
//         indicator_column_id -> Text,
//         value -> Text,
//     }
// }

// diesel::table! {
//     insurance_provider (id) {
//         id -> Text,
//         provider_name -> Text,
//         is_active -> Bool,
//         prescription_validity_days -> Nullable<Int4>,
//         comment -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::InvoiceType;
//     use super::sql_types::InvoiceStatus;

//     invoice (id) {
//         id -> Text,
//         name_store_id -> Nullable<Text>,
//         user_id -> Nullable<Text>,
//         store_id -> Text,
//         invoice_number -> Int8,
//         #[sql_name = "type"]
//         type_ -> InvoiceType,
//         status -> InvoiceStatus,
//         on_hold -> Bool,
//         comment -> Nullable<Text>,
//         their_reference -> Nullable<Text>,
//         transport_reference -> Nullable<Text>,
//         created_datetime -> Timestamp,
//         allocated_datetime -> Nullable<Timestamp>,
//         picked_datetime -> Nullable<Timestamp>,
//         shipped_datetime -> Nullable<Timestamp>,
//         delivered_datetime -> Nullable<Timestamp>,
//         verified_datetime -> Nullable<Timestamp>,
//         colour -> Nullable<Text>,
//         requisition_id -> Nullable<Text>,
//         linked_invoice_id -> Nullable<Text>,
//         tax_percentage -> Nullable<Float8>,
//         currency_id -> Nullable<Text>,
//         currency_rate -> Float8,
//         name_link_id -> Text,
//         clinician_link_id -> Nullable<Text>,
//         original_shipment_id -> Nullable<Text>,
//         backdated_datetime -> Nullable<Timestamp>,
//         diagnosis_id -> Nullable<Text>,
//         program_id -> Nullable<Text>,
//         name_insurance_join_id -> Nullable<Text>,
//         insurance_discount_amount -> Nullable<Float8>,
//         insurance_discount_percentage -> Nullable<Float8>,
//         is_cancellation -> Bool,
//         cancelled_datetime -> Nullable<Timestamp>,
//         expected_delivery_date -> Nullable<Date>,
//         default_donor_link_id -> Nullable<Text>,
//         purchase_order_id -> Nullable<Text>,
//         received_datetime -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::InvoiceLineType;

//     invoice_line (id) {
//         id -> Text,
//         invoice_id -> Text,
//         item_name -> Text,
//         item_code -> Text,
//         stock_line_id -> Nullable<Text>,
//         location_id -> Nullable<Text>,
//         batch -> Nullable<Text>,
//         expiry_date -> Nullable<Date>,
//         cost_price_per_pack -> Float8,
//         sell_price_per_pack -> Float8,
//         total_before_tax -> Float8,
//         total_after_tax -> Float8,
//         tax_percentage -> Nullable<Float8>,
//         #[sql_name = "type"]
//         type_ -> InvoiceLineType,
//         number_of_packs -> Float8,
//         pack_size -> Float8,
//         note -> Nullable<Text>,
//         foreign_currency_price_before_tax -> Nullable<Float8>,
//         item_link_id -> Text,
//         item_variant_id -> Nullable<Text>,
//         prescribed_quantity -> Nullable<Float8>,
//         linked_invoice_id -> Nullable<Text>,
//         reason_option_id -> Nullable<Text>,
//         vvm_status_id -> Nullable<Text>,
//         donor_link_id -> Nullable<Text>,
//         campaign_id -> Nullable<Text>,
//         shipped_number_of_packs -> Nullable<Float8>,
//         purchase_order_line_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::ItemType;
//     use super::sql_types::VenCategory;

//     item (id) {
//         id -> Text,
//         name -> Text,
//         code -> Text,
//         unit_id -> Nullable<Text>,
//         #[sql_name = "type"]
//         type_ -> ItemType,
//         default_pack_size -> Float8,
//         legacy_record -> Text,
//         is_active -> Bool,
//         is_vaccine -> Bool,
//         strength -> Nullable<Text>,
//         ven_category -> VenCategory,
//         vaccine_doses -> Int4,
//     }
// }

// diesel::table! {
//     item_category_join (id) {
//         id -> Text,
//         item_id -> Text,
//         category_id -> Text,
//         deleted_datetime -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     item_direction (id) {
//         id -> Text,
//         item_link_id -> Text,
//         directions -> Text,
//         priority -> Int8,
//     }
// }

// diesel::table! {
//     item_link (id) {
//         id -> Text,
//         item_id -> Text,
//     }
// }

// diesel::table! {
//     item_variant (id) {
//         id -> Text,
//         name -> Text,
//         item_link_id -> Text,
//         cold_storage_type_id -> Nullable<Text>,
//         manufacturer_link_id -> Nullable<Text>,
//         deleted_datetime -> Nullable<Timestamp>,
//         vvm_type -> Nullable<Text>,
//         created_datetime -> Timestamp,
//         created_by -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     item_warning_join (id) {
//         id -> Text,
//         item_link_id -> Text,
//         warning_id -> Text,
//         priority -> Bool,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::KeyType;

//     key_value_store (id) {
//         id -> KeyType,
//         value_string -> Nullable<Text>,
//         value_int -> Nullable<Int4>,
//         value_bigint -> Nullable<Int8>,
//         value_float -> Nullable<Float8>,
//         value_bool -> Nullable<Bool>,
//     }
// }

diesel::table! {
    location (id) {
        id -> Text,
        code -> Text,
        name -> Text,
        on_hold -> Bool,
        store_id -> Text,
        cold_storage_type_id -> Nullable<Text>,
    }
}

// diesel::table! {
//     location_movement (id) {
//         id -> Text,
//         store_id -> Nullable<Text>,
//         location_id -> Nullable<Text>,
//         stock_line_id -> Nullable<Text>,
//         enter_datetime -> Nullable<Timestamp>,
//         exit_datetime -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     master_list (id) {
//         id -> Text,
//         name -> Text,
//         code -> Text,
//         description -> Text,
//         is_active -> Bool,
//         is_default_price_list -> Nullable<Bool>,
//         discount_percentage -> Nullable<Float8>,
//     }
// }

// diesel::table! {
//     master_list_line (id) {
//         id -> Text,
//         master_list_id -> Text,
//         item_link_id -> Text,
//         price_per_unit -> Nullable<Float8>,
//     }
// }

// diesel::table! {
//     master_list_name_join (id) {
//         id -> Text,
//         master_list_id -> Text,
//         name_link_id -> Text,
//     }
// }

// diesel::table! {
//     migration_fragment_log (version_and_identifier) {
//         version_and_identifier -> Text,
//         datetime -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::NameType;
//     use super::sql_types::GenderType;

//     name (id) {
//         id -> Text,
//         name -> Text,
//         code -> Text,
//         #[sql_name = "type"]
//         type_ -> NameType,
//         is_customer -> Bool,
//         is_supplier -> Bool,
//         supplying_store_id -> Nullable<Text>,
//         first_name -> Nullable<Text>,
//         last_name -> Nullable<Text>,
//         gender -> Nullable<GenderType>,
//         date_of_birth -> Nullable<Date>,
//         phone -> Nullable<Text>,
//         charge_code -> Nullable<Text>,
//         comment -> Nullable<Text>,
//         country -> Nullable<Text>,
//         address1 -> Nullable<Text>,
//         address2 -> Nullable<Text>,
//         email -> Nullable<Text>,
//         website -> Nullable<Text>,
//         is_manufacturer -> Nullable<Bool>,
//         is_donor -> Nullable<Bool>,
//         on_hold -> Nullable<Bool>,
//         created_datetime -> Nullable<Timestamp>,
//         is_deceased -> Bool,
//         national_health_number -> Nullable<Text>,
//         is_sync_update -> Bool,
//         date_of_death -> Nullable<Date>,
//         custom_data -> Nullable<Text>,
//         deleted_datetime -> Nullable<Timestamp>,
//         properties -> Nullable<Text>,
//         next_of_kin_id -> Nullable<Text>,
//         next_of_kin_name -> Nullable<Text>,
//         hsh_code -> Nullable<Text>,
//         hsh_name -> Nullable<Text>,
//         margin -> Nullable<Float8>,
//         freight_factor -> Nullable<Float8>,
//         currency_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::InsurancePolicyType;

//     name_insurance_join (id) {
//         id -> Text,
//         name_link_id -> Text,
//         insurance_provider_id -> Text,
//         policy_number_person -> Nullable<Text>,
//         policy_number_family -> Nullable<Text>,
//         policy_number -> Text,
//         policy_type -> InsurancePolicyType,
//         discount_percentage -> Float8,
//         expiry_date -> Date,
//         is_active -> Bool,
//         entered_by_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     name_link (id) {
//         id -> Text,
//         name_id -> Text,
//     }
// }

// diesel::table! {
//     name_property (id) {
//         id -> Text,
//         property_id -> Text,
//         remote_editable -> Bool,
//     }
// }

// diesel::table! {
//     name_store_join (id) {
//         id -> Text,
//         store_id -> Text,
//         name_is_customer -> Bool,
//         name_is_supplier -> Bool,
//         is_sync_update -> Bool,
//         name_link_id -> Text,
//     }
// }

// diesel::table! {
//     name_tag (id) {
//         id -> Text,
//         name -> Text,
//     }
// }

// diesel::table! {
//     name_tag_join (id) {
//         id -> Text,
//         name_tag_id -> Text,
//         name_link_id -> Text,
//     }
// }

// diesel::table! {
//     number (id) {
//         id -> Text,
//         value -> Int8,
//         store_id -> Text,
//         #[sql_name = "type"]
//         type_ -> Text,
//     }
// }

// diesel::table! {
//     packaging_variant (id) {
//         id -> Text,
//         name -> Text,
//         item_variant_id -> Text,
//         packaging_level -> Int4,
//         pack_size -> Nullable<Float8>,
//         volume_per_unit -> Nullable<Float8>,
//         deleted_datetime -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     period (id) {
//         id -> Text,
//         period_schedule_id -> Text,
//         name -> Text,
//         start_date -> Date,
//         end_date -> Date,
//     }
// }

// diesel::table! {
//     period_schedule (id) {
//         id -> Text,
//         name -> Text,
//     }
// }

// diesel::table! {
//     plugin_data (id) {
//         id -> Text,
//         store_id -> Nullable<Text>,
//         plugin_code -> Text,
//         related_record_id -> Nullable<Text>,
//         data_identifier -> Text,
//         data -> Text,
//     }
// }

// diesel::table! {
//     preference (id) {
//         id -> Text,
//         key -> Text,
//         value -> Text,
//         store_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     printer (id) {
//         id -> Text,
//         description -> Text,
//         address -> Text,
//         port -> Int4,
//         label_width -> Int4,
//         label_height -> Int4,
//     }
// }

// diesel::table! {
//     program (id) {
//         id -> Text,
//         master_list_id -> Nullable<Text>,
//         name -> Text,
//         context_id -> Text,
//         is_immunisation -> Bool,
//         elmis_code -> Nullable<Text>,
//         deleted_datetime -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     program_enrolment (id) {
//         id -> Text,
//         document_name -> Text,
//         enrolment_datetime -> Timestamp,
//         program_enrolment_id -> Nullable<Text>,
//         program_id -> Text,
//         document_type -> Text,
//         status -> Nullable<Text>,
//         patient_link_id -> Text,
//         store_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     program_event (id) {
//         id -> Text,
//         datetime -> Timestamp,
//         active_start_datetime -> Timestamp,
//         active_end_datetime -> Timestamp,
//         document_type -> Text,
//         document_name -> Nullable<Text>,
//         #[sql_name = "type"]
//         type_ -> Text,
//         data -> Nullable<Text>,
//         context_id -> Text,
//         patient_link_id -> Text,
//     }
// }

// diesel::table! {
//     program_indicator (id) {
//         id -> Text,
//         program_id -> Text,
//         code -> Nullable<Text>,
//         is_active -> Bool,
//     }
// }

// diesel::table! {
//     program_requisition_order_type (id) {
//         id -> Text,
//         program_requisition_settings_id -> Text,
//         name -> Text,
//         threshold_mos -> Float8,
//         max_mos -> Float8,
//         max_order_per_period -> Int4,
//         is_emergency -> Bool,
//         max_items_in_emergency_order -> Int4,
//     }
// }

// diesel::table! {
//     program_requisition_settings (id) {
//         id -> Text,
//         name_tag_id -> Text,
//         program_id -> Text,
//         period_schedule_id -> Text,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::PropertyValueType;

//     property (id) {
//         id -> Text,
//         key -> Text,
//         name -> Text,
//         value_type -> PropertyValueType,
//         allowed_values -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::PurchaseOrderStatus;

//     purchase_order (id) {
//         id -> Text,
//         store_id -> Text,
//         user_id -> Nullable<Text>,
//         supplier_name_link_id -> Nullable<Text>,
//         purchase_order_number -> Int8,
//         status -> PurchaseOrderStatus,
//         created_datetime -> Timestamp,
//         confirmed_datetime -> Nullable<Timestamp>,
//         delivered_datetime -> Nullable<Timestamp>,
//         target_months -> Nullable<Float8>,
//         comment -> Nullable<Text>,
//         supplier_discount_percentage -> Nullable<Float8>,
//         supplier_discount_amount -> Nullable<Float8>,
//         donor_link_id -> Nullable<Text>,
//         reference -> Nullable<Text>,
//         currency_id -> Nullable<Text>,
//         foreign_exchange_rate -> Nullable<Float8>,
//         shipping_method -> Nullable<Text>,
//         sent_datetime -> Nullable<Timestamp>,
//         contract_signed_datetime -> Nullable<Timestamp>,
//         advance_paid_datetime -> Nullable<Timestamp>,
//         received_at_port_datetime -> Nullable<Date>,
//         expected_delivery_datetime -> Nullable<Date>,
//         supplier_agent -> Nullable<Text>,
//         authorising_officer_1 -> Nullable<Text>,
//         authorising_officer_2 -> Nullable<Text>,
//         additional_instructions -> Nullable<Text>,
//         heading_message -> Nullable<Text>,
//         agent_commission -> Nullable<Float8>,
//         document_charge -> Nullable<Float8>,
//         communications_charge -> Nullable<Float8>,
//         insurance_charge -> Nullable<Float8>,
//         freight_charge -> Nullable<Float8>,
//         freight_conditions -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     purchase_order_line (id) {
//         id -> Text,
//         purchase_order_id -> Text,
//         line_number -> Nullable<Int4>,
//         item_link_id -> Nullable<Text>,
//         item_code -> Text,
//         item_name -> Nullable<Text>,
//         number_of_packs -> Nullable<Float8>,
//         pack_size -> Nullable<Float8>,
//         requested_quantity -> Nullable<Float8>,
//         authorised_quantity -> Nullable<Float8>,
//         total_received -> Nullable<Float8>,
//         requested_delivery_date -> Nullable<Date>,
//         expected_delivery_date -> Nullable<Date>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::ReasonOptionType;

//     reason_option (id) {
//         id -> Text,
//         #[sql_name = "type"]
//         type_ -> ReasonOptionType,
//         is_active -> Bool,
//         reason -> Text,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::ContextType;

//     report (id) {
//         id -> Text,
//         name -> Text,
//         template -> Text,
//         comment -> Nullable<Text>,
//         sub_context -> Nullable<Text>,
//         argument_schema_id -> Nullable<Text>,
//         context -> ContextType,
//         is_custom -> Bool,
//         version -> Text,
//         code -> Text,
//         is_active -> Bool,
//         excel_template_buffer -> Nullable<Bytea>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::RequisitionType;
//     use super::sql_types::RequisitionStatus;
//     use super::sql_types::ApprovalStatusType;

//     requisition (id) {
//         id -> Text,
//         requisition_number -> Int8,
//         store_id -> Text,
//         user_id -> Nullable<Text>,
//         #[sql_name = "type"]
//         type_ -> RequisitionType,
//         status -> RequisitionStatus,
//         created_datetime -> Timestamp,
//         sent_datetime -> Nullable<Timestamp>,
//         finalised_datetime -> Nullable<Timestamp>,
//         expected_delivery_date -> Nullable<Date>,
//         colour -> Nullable<Text>,
//         comment -> Nullable<Text>,
//         their_reference -> Nullable<Text>,
//         max_months_of_stock -> Float8,
//         min_months_of_stock -> Float8,
//         linked_requisition_id -> Nullable<Text>,
//         approval_status -> Nullable<ApprovalStatusType>,
//         is_sync_update -> Bool,
//         program_id -> Nullable<Text>,
//         period_id -> Nullable<Text>,
//         order_type -> Nullable<Text>,
//         name_link_id -> Text,
//         is_emergency -> Bool,
//     }
// }

// diesel::table! {
//     requisition_line (id) {
//         id -> Text,
//         requisition_id -> Text,
//         requested_quantity -> Float8,
//         suggested_quantity -> Float8,
//         supply_quantity -> Float8,
//         available_stock_on_hand -> Float8,
//         average_monthly_consumption -> Float8,
//         snapshot_datetime -> Nullable<Timestamp>,
//         comment -> Nullable<Text>,
//         approved_quantity -> Float8,
//         approval_comment -> Nullable<Text>,
//         is_sync_update -> Bool,
//         item_link_id -> Text,
//         item_name -> Text,
//         initial_stock_on_hand_units -> Float8,
//         incoming_units -> Float8,
//         outgoing_units -> Float8,
//         loss_in_units -> Float8,
//         addition_in_units -> Float8,
//         expiring_units -> Float8,
//         days_out_of_stock -> Float8,
//         option_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::RnRFormStatus;

//     rnr_form (id) {
//         id -> Text,
//         store_id -> Text,
//         name_link_id -> Text,
//         period_id -> Text,
//         program_id -> Text,
//         status -> RnRFormStatus,
//         created_datetime -> Timestamp,
//         finalised_datetime -> Nullable<Timestamp>,
//         linked_requisition_id -> Nullable<Text>,
//         their_reference -> Nullable<Text>,
//         comment -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::RnRFormLowStock;

//     rnr_form_line (id) {
//         id -> Text,
//         rnr_form_id -> Text,
//         item_link_id -> Text,
//         requisition_line_id -> Nullable<Text>,
//         average_monthly_consumption -> Float8,
//         previous_monthly_consumption_values -> Text,
//         initial_balance -> Float8,
//         snapshot_quantity_received -> Float8,
//         snapshot_quantity_consumed -> Float8,
//         snapshot_adjustments -> Float8,
//         entered_quantity_received -> Nullable<Float8>,
//         entered_quantity_consumed -> Nullable<Float8>,
//         entered_adjustments -> Nullable<Float8>,
//         adjusted_quantity_consumed -> Float8,
//         stock_out_duration -> Int4,
//         final_balance -> Float8,
//         maximum_quantity -> Float8,
//         expiry_date -> Nullable<Date>,
//         calculated_requested_quantity -> Float8,
//         low_stock -> RnRFormLowStock,
//         entered_requested_quantity -> Nullable<Float8>,
//         comment -> Nullable<Text>,
//         confirmed -> Bool,
//         entered_losses -> Nullable<Float8>,
//         minimum_quantity -> Float8,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::SensorType;

//     sensor (id) {
//         id -> Text,
//         serial -> Text,
//         name -> Text,
//         is_active -> Nullable<Bool>,
//         store_id -> Text,
//         location_id -> Nullable<Text>,
//         battery_level -> Nullable<Int4>,
//         log_interval -> Nullable<Int4>,
//         last_connection_datetime -> Nullable<Timestamp>,
//         #[sql_name = "type"]
//         type_ -> Nullable<SensorType>,
//     }
// }

// diesel::table! {
//     stock_line (id) {
//         id -> Text,
//         store_id -> Text,
//         location_id -> Nullable<Text>,
//         batch -> Nullable<Text>,
//         expiry_date -> Nullable<Date>,
//         cost_price_per_pack -> Float8,
//         sell_price_per_pack -> Float8,
//         available_number_of_packs -> Float8,
//         total_number_of_packs -> Float8,
//         pack_size -> Float8,
//         on_hold -> Bool,
//         note -> Nullable<Text>,
//         barcode_id -> Nullable<Text>,
//         item_link_id -> Text,
//         supplier_link_id -> Nullable<Text>,
//         item_variant_id -> Nullable<Text>,
//         vvm_status_id -> Nullable<Text>,
//         campaign_id -> Nullable<Text>,
//         donor_link_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::StocktakeStatus;

//     stocktake (id) {
//         id -> Text,
//         store_id -> Text,
//         user_id -> Text,
//         stocktake_number -> Int8,
//         comment -> Nullable<Text>,
//         description -> Nullable<Text>,
//         status -> StocktakeStatus,
//         created_datetime -> Timestamp,
//         stocktake_date -> Nullable<Date>,
//         finalised_datetime -> Nullable<Timestamp>,
//         is_locked -> Nullable<Bool>,
//         inventory_addition_id -> Nullable<Text>,
//         inventory_reduction_id -> Nullable<Text>,
//         program_id -> Nullable<Text>,
//         counted_by -> Nullable<Text>,
//         verified_by -> Nullable<Text>,
//         is_initial_stocktake -> Bool,
//     }
// }

// diesel::table! {
//     stocktake_line (id) {
//         id -> Text,
//         stocktake_id -> Text,
//         stock_line_id -> Nullable<Text>,
//         location_id -> Nullable<Text>,
//         comment -> Nullable<Text>,
//         snapshot_number_of_packs -> Float8,
//         counted_number_of_packs -> Nullable<Float8>,
//         batch -> Nullable<Text>,
//         expiry_date -> Nullable<Date>,
//         pack_size -> Nullable<Float8>,
//         cost_price_per_pack -> Nullable<Float8>,
//         sell_price_per_pack -> Nullable<Float8>,
//         note -> Nullable<Text>,
//         item_link_id -> Text,
//         item_name -> Text,
//         item_variant_id -> Nullable<Text>,
//         donor_link_id -> Nullable<Text>,
//         reason_option_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::StoreMode;

//     store (id) {
//         id -> Text,
//         code -> Text,
//         site_id -> Int4,
//         store_mode -> StoreMode,
//         logo -> Nullable<Text>,
//         created_date -> Nullable<Date>,
//         name_link_id -> Nullable<Text>,
//         is_disabled -> Bool,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::StorePreferenceType;

//     store_preference (id) {
//         id -> Text,
//         #[sql_name = "type"]
//         type_ -> Nullable<StorePreferenceType>,
//         pack_to_one -> Bool,
//         response_requisition_requires_authorisation -> Bool,
//         request_requisition_requires_authorisation -> Bool,
//         om_program_module -> Bool,
//         vaccine_module -> Bool,
//         issue_in_foreign_currency -> Bool,
//         monthly_consumption_look_back_period -> Nullable<Float8>,
//         months_lead_time -> Nullable<Float8>,
//         months_overstock -> Nullable<Float8>,
//         months_understock -> Nullable<Float8>,
//         months_items_expire -> Nullable<Float8>,
//         stocktake_frequency -> Nullable<Float8>,
//         extra_fields_in_requisition -> Bool,
//         keep_requisition_lines_with_zero_requested_quantity_on_finalise -> Bool,
//         use_consumption_and_stock_from_customers_for_internal_orders -> Bool,
//         manually_link_internal_order_to_inbound_shipment -> Bool,
//         edit_prescribed_quantity_on_prescription -> Bool,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::SyncAction;

//     sync_buffer (record_id) {
//         record_id -> Text,
//         received_datetime -> Timestamp,
//         integration_datetime -> Nullable<Timestamp>,
//         integration_error -> Nullable<Text>,
//         table_name -> Text,
//         action -> SyncAction,
//         data -> Text,
//         source_site_id -> Nullable<Int4>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::SyncFileDirection;
//     use super::sql_types::SyncFileStatus;

//     sync_file_reference (id) {
//         id -> Text,
//         table_name -> Text,
//         record_id -> Text,
//         file_name -> Text,
//         mime_type -> Nullable<Text>,
//         uploaded_bytes -> Int4,
//         downloaded_bytes -> Int4,
//         total_bytes -> Int4,
//         retries -> Int4,
//         retry_at -> Nullable<Timestamp>,
//         direction -> SyncFileDirection,
//         status -> SyncFileStatus,
//         error -> Nullable<Text>,
//         created_datetime -> Timestamp,
//         deleted_datetime -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::SyncApiErrorCode;

//     sync_log (id) {
//         id -> Text,
//         started_datetime -> Timestamp,
//         finished_datetime -> Nullable<Timestamp>,
//         prepare_initial_started_datetime -> Nullable<Timestamp>,
//         prepare_initial_finished_datetime -> Nullable<Timestamp>,
//         push_started_datetime -> Nullable<Timestamp>,
//         push_finished_datetime -> Nullable<Timestamp>,
//         push_progress_total -> Nullable<Int4>,
//         push_progress_done -> Nullable<Int4>,
//         pull_central_started_datetime -> Nullable<Timestamp>,
//         pull_central_finished_datetime -> Nullable<Timestamp>,
//         pull_central_progress_total -> Nullable<Int4>,
//         pull_central_progress_done -> Nullable<Int4>,
//         pull_remote_started_datetime -> Nullable<Timestamp>,
//         pull_remote_finished_datetime -> Nullable<Timestamp>,
//         pull_remote_progress_total -> Nullable<Int4>,
//         pull_remote_progress_done -> Nullable<Int4>,
//         integration_started_datetime -> Nullable<Timestamp>,
//         integration_finished_datetime -> Nullable<Timestamp>,
//         error_message -> Nullable<Text>,
//         error_code -> Nullable<SyncApiErrorCode>,
//         integration_progress_total -> Nullable<Int4>,
//         integration_progress_done -> Nullable<Int4>,
//         pull_v6_started_datetime -> Nullable<Timestamp>,
//         pull_v6_finished_datetime -> Nullable<Timestamp>,
//         pull_v6_progress_total -> Nullable<Int4>,
//         pull_v6_progress_done -> Nullable<Int4>,
//         push_v6_started_datetime -> Nullable<Timestamp>,
//         push_v6_finished_datetime -> Nullable<Timestamp>,
//         push_v6_progress_total -> Nullable<Int4>,
//         push_v6_progress_done -> Nullable<Int4>,
//         duration_in_seconds -> Int4,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::SyncMessageStatus;

//     sync_message (id) {
//         id -> Text,
//         to_store_id -> Nullable<Text>,
//         from_store_id -> Nullable<Text>,
//         body -> Text,
//         created_datetime -> Timestamp,
//         status -> SyncMessageStatus,
//         #[sql_name = "type"]
//         type_ -> Nullable<Text>,
//         error_message -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::SystemLogType;

//     system_log (id) {
//         id -> Text,
//         #[sql_name = "type"]
//         type_ -> SystemLogType,
//         sync_site_id -> Nullable<Int4>,
//         datetime -> Timestamp,
//         message -> Nullable<Text>,
//         is_error -> Bool,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::TemperatureBreachType;

//     temperature_breach (id) {
//         id -> Text,
//         duration_milliseconds -> Int4,
//         #[sql_name = "type"]
//         type_ -> TemperatureBreachType,
//         sensor_id -> Text,
//         store_id -> Text,
//         location_id -> Nullable<Text>,
//         start_datetime -> Timestamp,
//         end_datetime -> Nullable<Timestamp>,
//         unacknowledged -> Nullable<Bool>,
//         threshold_minimum -> Float8,
//         threshold_maximum -> Float8,
//         threshold_duration_milliseconds -> Int4,
//         comment -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::TemperatureBreachType;

//     temperature_breach_config (id) {
//         id -> Text,
//         duration_milliseconds -> Int4,
//         #[sql_name = "type"]
//         type_ -> TemperatureBreachType,
//         description -> Text,
//         is_active -> Nullable<Bool>,
//         store_id -> Text,
//         minimum_temperature -> Float8,
//         maximum_temperature -> Float8,
//     }
// }

// diesel::table! {
//     temperature_log (id) {
//         id -> Text,
//         temperature -> Float8,
//         sensor_id -> Text,
//         store_id -> Text,
//         location_id -> Nullable<Text>,
//         datetime -> Timestamp,
//         temperature_breach_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     unit (id) {
//         id -> Text,
//         name -> Text,
//         description -> Nullable<Text>,
//         index -> Int4,
//         is_active -> Bool,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::LanguageType;

//     user_account (id) {
//         id -> Text,
//         username -> Text,
//         hashed_password -> Text,
//         email -> Nullable<Text>,
//         language -> LanguageType,
//         first_name -> Nullable<Text>,
//         last_name -> Nullable<Text>,
//         phone_number -> Nullable<Text>,
//         job_title -> Nullable<Text>,
//         last_successful_sync -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     use diesel::sql_types::*;
//     use super::sql_types::PermissionType;

//     user_permission (id) {
//         id -> Text,
//         user_id -> Text,
//         store_id -> Text,
//         permission -> PermissionType,
//         context_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     user_store_join (id) {
//         id -> Text,
//         user_id -> Text,
//         store_id -> Text,
//         is_default -> Bool,
//     }
// }

// diesel::table! {
//     vaccination (id) {
//         id -> Text,
//         program_enrolment_id -> Text,
//         encounter_id -> Text,
//         created_datetime -> Timestamp,
//         user_id -> Text,
//         vaccine_course_dose_id -> Text,
//         store_id -> Text,
//         clinician_link_id -> Nullable<Text>,
//         invoice_id -> Nullable<Text>,
//         stock_line_id -> Nullable<Text>,
//         vaccination_date -> Date,
//         given -> Bool,
//         not_given_reason -> Nullable<Text>,
//         comment -> Nullable<Text>,
//         facility_name_link_id -> Nullable<Text>,
//         facility_free_text -> Nullable<Text>,
//         patient_link_id -> Text,
//         given_store_id -> Nullable<Text>,
//         item_link_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     vaccine_course (id) {
//         id -> Text,
//         name -> Text,
//         program_id -> Text,
//         coverage_rate -> Float8,
//         use_in_gaps_calculations -> Bool,
//         wastage_rate -> Float8,
//         deleted_datetime -> Nullable<Timestamp>,
//         demographic_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     vaccine_course_dose (id) {
//         id -> Text,
//         vaccine_course_id -> Text,
//         label -> Text,
//         min_interval_days -> Int4,
//         min_age -> Float8,
//         max_age -> Float8,
//         deleted_datetime -> Nullable<Timestamp>,
//         custom_age_label -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     vaccine_course_item (id) {
//         id -> Text,
//         vaccine_course_id -> Text,
//         item_link_id -> Text,
//         deleted_datetime -> Nullable<Timestamp>,
//     }
// }

// diesel::table! {
//     vvm_status (id) {
//         id -> Text,
//         description -> Text,
//         code -> Text,
//         level -> Int4,
//         is_active -> Bool,
//         unusable -> Bool,
//         reason_id -> Nullable<Text>,
//     }
// }

// diesel::table! {
//     vvm_status_log (id) {
//         id -> Text,
//         status_id -> Text,
//         created_datetime -> Timestamp,
//         stock_line_id -> Text,
//         comment -> Nullable<Text>,
//         created_by -> Text,
//         invoice_line_id -> Nullable<Text>,
//         store_id -> Text,
//     }
// }

// diesel::table! {
//     warning (id) {
//         id -> Text,
//         warning_text -> Text,
//         code -> Text,
//     }
// }

// diesel::joinable!(activity_log -> store (store_id));
// diesel::joinable!(asset -> asset_catalogue_item (asset_catalogue_item_id));
// diesel::joinable!(asset -> asset_catalogue_type (asset_catalogue_type_id));
// diesel::joinable!(asset -> asset_category (asset_category_id));
// diesel::joinable!(asset -> asset_class (asset_class_id));
// diesel::joinable!(asset -> name_link (donor_name_id));
// diesel::joinable!(asset -> store (store_id));
// diesel::joinable!(asset_catalogue_item -> asset_catalogue_type (asset_catalogue_type_id));
// diesel::joinable!(asset_catalogue_item -> asset_category (asset_category_id));
// diesel::joinable!(asset_catalogue_item -> asset_class (asset_class_id));
// diesel::joinable!(asset_catalogue_type -> asset_category (asset_category_id));
// diesel::joinable!(asset_category -> asset_class (asset_class_id));
// diesel::joinable!(asset_internal_location -> asset (asset_id));
// diesel::joinable!(asset_internal_location -> location (location_id));
// diesel::joinable!(asset_log -> asset (asset_id));
// diesel::joinable!(asset_log -> asset_log_reason (reason_id));
// diesel::joinable!(barcode -> item (item_id));
// diesel::joinable!(barcode -> name_link (manufacturer_link_id));
// diesel::joinable!(changelog -> name_link (name_link_id));
// diesel::joinable!(clinician -> store (store_id));
// diesel::joinable!(clinician_link -> clinician (clinician_id));
// diesel::joinable!(clinician_store_join -> clinician_link (clinician_link_id));
// diesel::joinable!(clinician_store_join -> store (store_id));
// diesel::joinable!(contact_form -> store (store_id));
// diesel::joinable!(contact_trace -> document (document_id));
// diesel::joinable!(contact_trace -> program (program_id));
// diesel::joinable!(contact_trace -> store (store_id));
// diesel::joinable!(demographic_indicator -> demographic (demographic_id));
// diesel::joinable!(document -> context (context_id));
// diesel::joinable!(document -> form_schema (form_schema_id));
// diesel::joinable!(document -> name_link (owner_name_link_id));
// diesel::joinable!(document_registry -> context (context_id));
// diesel::joinable!(document_registry -> form_schema (form_schema_id));
// diesel::joinable!(encounter -> name_link (patient_link_id));
// diesel::joinable!(encounter -> program (program_id));
// diesel::joinable!(indicator_column -> program_indicator (program_indicator_id));
// diesel::joinable!(indicator_line -> program_indicator (program_indicator_id));
// diesel::joinable!(indicator_value -> indicator_column (indicator_column_id));
// diesel::joinable!(indicator_value -> indicator_line (indicator_line_id));
// diesel::joinable!(indicator_value -> name_link (customer_name_link_id));
// diesel::joinable!(indicator_value -> period (period_id));
// diesel::joinable!(indicator_value -> store (store_id));
// diesel::joinable!(invoice -> clinician_link (clinician_link_id));
// diesel::joinable!(invoice -> currency (currency_id));
// diesel::joinable!(invoice -> diagnosis (diagnosis_id));
// diesel::joinable!(invoice -> name_insurance_join (name_insurance_join_id));
// diesel::joinable!(invoice -> program (program_id));
// diesel::joinable!(invoice -> purchase_order (purchase_order_id));
// diesel::joinable!(invoice_line -> campaign (campaign_id));
// diesel::joinable!(invoice_line -> invoice (invoice_id));
// diesel::joinable!(invoice_line -> item_link (item_link_id));
// diesel::joinable!(invoice_line -> item_variant (item_variant_id));
// diesel::joinable!(invoice_line -> location (location_id));
// diesel::joinable!(invoice_line -> name_link (donor_link_id));
// diesel::joinable!(invoice_line -> purchase_order (purchase_order_line_id));
// diesel::joinable!(invoice_line -> reason_option (reason_option_id));
// diesel::joinable!(invoice_line -> stock_line (stock_line_id));
// diesel::joinable!(invoice_line -> vvm_status (vvm_status_id));
// diesel::joinable!(item -> unit (unit_id));
// diesel::joinable!(item_category_join -> category (category_id));
// diesel::joinable!(item_category_join -> item (item_id));
// diesel::joinable!(item_direction -> item_link (item_link_id));
// diesel::joinable!(item_link -> item (item_id));
// diesel::joinable!(item_variant -> cold_storage_type (cold_storage_type_id));
// diesel::joinable!(item_variant -> item_link (item_link_id));
// diesel::joinable!(item_variant -> name_link (manufacturer_link_id));
// diesel::joinable!(item_warning_join -> item_link (item_link_id));
// diesel::joinable!(item_warning_join -> warning (warning_id));
// diesel::joinable!(location -> cold_storage_type (cold_storage_type_id));
// diesel::joinable!(location -> store (store_id));
// diesel::joinable!(location_movement -> location (location_id));
// diesel::joinable!(location_movement -> stock_line (stock_line_id));
// diesel::joinable!(location_movement -> store (store_id));
// diesel::joinable!(master_list_line -> item_link (item_link_id));
// diesel::joinable!(master_list_line -> master_list (master_list_id));
// diesel::joinable!(master_list_name_join -> master_list (master_list_id));
// diesel::joinable!(master_list_name_join -> name_link (name_link_id));
// diesel::joinable!(name -> currency (currency_id));
// diesel::joinable!(name_insurance_join -> insurance_provider (insurance_provider_id));
// diesel::joinable!(name_insurance_join -> name_link (name_link_id));
// diesel::joinable!(name_link -> name (name_id));
// diesel::joinable!(name_property -> property (property_id));
// diesel::joinable!(name_store_join -> name_link (name_link_id));
// diesel::joinable!(name_store_join -> store (store_id));
// diesel::joinable!(name_tag_join -> name_link (name_link_id));
// diesel::joinable!(name_tag_join -> name_tag (name_tag_id));
// diesel::joinable!(number -> store (store_id));
// diesel::joinable!(packaging_variant -> item_variant (item_variant_id));
// diesel::joinable!(period -> period_schedule (period_schedule_id));
// diesel::joinable!(plugin_data -> store (store_id));
// diesel::joinable!(preference -> store (store_id));
// diesel::joinable!(program -> context (context_id));
// diesel::joinable!(program -> master_list (master_list_id));
// diesel::joinable!(program_enrolment -> name_link (patient_link_id));
// diesel::joinable!(program_enrolment -> program (program_id));
// diesel::joinable!(program_enrolment -> store (store_id));
// diesel::joinable!(program_event -> context (context_id));
// diesel::joinable!(program_event -> name_link (patient_link_id));
// diesel::joinable!(program_indicator -> program (program_id));
// diesel::joinable!(program_requisition_order_type -> program_requisition_settings (program_requisition_settings_id));
// diesel::joinable!(program_requisition_settings -> name_tag (name_tag_id));
// diesel::joinable!(program_requisition_settings -> period_schedule (period_schedule_id));
// diesel::joinable!(program_requisition_settings -> program (program_id));
// diesel::joinable!(purchase_order -> currency (currency_id));
// diesel::joinable!(purchase_order -> store (store_id));
// diesel::joinable!(purchase_order_line -> item_link (item_link_id));
// diesel::joinable!(purchase_order_line -> purchase_order (purchase_order_id));
// diesel::joinable!(report -> form_schema (argument_schema_id));
// diesel::joinable!(requisition -> name_link (name_link_id));
// diesel::joinable!(requisition -> period (period_id));
// diesel::joinable!(requisition -> store (store_id));
// diesel::joinable!(requisition_line -> item_link (item_link_id));
// diesel::joinable!(requisition_line -> reason_option (option_id));
// diesel::joinable!(requisition_line -> requisition (requisition_id));
// diesel::joinable!(rnr_form -> name_link (name_link_id));
// diesel::joinable!(rnr_form -> period (period_id));
// diesel::joinable!(rnr_form -> program (program_id));
// diesel::joinable!(rnr_form -> store (store_id));
// diesel::joinable!(rnr_form_line -> item_link (item_link_id));
// diesel::joinable!(rnr_form_line -> rnr_form (rnr_form_id));
// diesel::joinable!(sensor -> location (location_id));
// diesel::joinable!(sensor -> store (store_id));
// diesel::joinable!(stock_line -> barcode (barcode_id));
// diesel::joinable!(stock_line -> campaign (campaign_id));
// diesel::joinable!(stock_line -> item_link (item_link_id));
// diesel::joinable!(stock_line -> item_variant (item_variant_id));
// diesel::joinable!(stock_line -> location (location_id));
// diesel::joinable!(stock_line -> store (store_id));
// diesel::joinable!(stock_line -> vvm_status (vvm_status_id));
// diesel::joinable!(stocktake -> program (program_id));
// diesel::joinable!(stocktake -> store (store_id));
// diesel::joinable!(stocktake_line -> item_link (item_link_id));
// diesel::joinable!(stocktake_line -> item_variant (item_variant_id));
// diesel::joinable!(stocktake_line -> location (location_id));
// diesel::joinable!(stocktake_line -> reason_option (reason_option_id));
// diesel::joinable!(stocktake_line -> stock_line (stock_line_id));
// diesel::joinable!(stocktake_line -> stocktake (stocktake_id));
// diesel::joinable!(store -> name_link (name_link_id));
// diesel::joinable!(temperature_breach -> location (location_id));
// diesel::joinable!(temperature_breach -> sensor (sensor_id));
// diesel::joinable!(temperature_breach -> store (store_id));
// diesel::joinable!(temperature_breach_config -> store (store_id));
// diesel::joinable!(temperature_log -> location (location_id));
// diesel::joinable!(temperature_log -> sensor (sensor_id));
// diesel::joinable!(temperature_log -> store (store_id));
// diesel::joinable!(temperature_log -> temperature_breach (temperature_breach_id));
// diesel::joinable!(user_permission -> context (context_id));
// diesel::joinable!(user_permission -> store (store_id));
// diesel::joinable!(user_store_join -> store (store_id));
// diesel::joinable!(user_store_join -> user_account (user_id));
// diesel::joinable!(vaccination -> vaccine_course_dose (vaccine_course_dose_id));
// diesel::joinable!(vaccine_course -> demographic (demographic_id));
// diesel::joinable!(vaccine_course -> program (program_id));
// diesel::joinable!(vaccine_course_dose -> vaccine_course (vaccine_course_id));
// diesel::joinable!(vaccine_course_item -> item_link (item_link_id));
// diesel::joinable!(vaccine_course_item -> vaccine_course (vaccine_course_id));
// diesel::joinable!(vvm_status_log -> invoice_line (invoice_line_id));
// diesel::joinable!(vvm_status_log -> stock_line (stock_line_id));
// diesel::joinable!(vvm_status_log -> store (store_id));

// diesel::allow_tables_to_appear_in_same_query!(
//     abbreviation,
//     activity_log,
//     asset,
//     asset_catalogue_item,
//     asset_catalogue_type,
//     asset_category,
//     asset_class,
//     asset_internal_location,
//     asset_log,
//     asset_log_reason,
//     asset_property,
//     backend_plugin,
//     barcode,
//     bundled_item,
//     campaign,
//     category,
//     changelog,
//     clinician,
//     clinician_link,
//     clinician_store_join,
//     cold_storage_type,
//     contact_form,
//     contact_trace,
//     context,
//     currency,
//     demographic,
//     demographic_indicator,
//     demographic_projection,
//     diagnosis,
//     document,
//     document_registry,
//     email_queue,
//     encounter,
//     form_schema,
//     frontend_plugin,
//     indicator_column,
//     indicator_line,
//     indicator_value,
//     insurance_provider,
//     invoice,
//     invoice_line,
//     item,
//     item_category_join,
//     item_direction,
//     item_link,
//     item_variant,
//     item_warning_join,
//     key_value_store,
//     location,
//     location_movement,
//     master_list,
//     master_list_line,
//     master_list_name_join,
//     migration_fragment_log,
//     name,
//     name_insurance_join,
//     name_link,
//     name_property,
//     name_store_join,
//     name_tag,
//     name_tag_join,
//     number,
//     packaging_variant,
//     period,
//     period_schedule,
//     plugin_data,
//     preference,
//     printer,
//     program,
//     program_enrolment,
//     program_event,
//     program_indicator,
//     program_requisition_order_type,
//     program_requisition_settings,
//     property,
//     purchase_order,
//     purchase_order_line,
//     reason_option,
//     report,
//     requisition,
//     requisition_line,
//     rnr_form,
//     rnr_form_line,
//     sensor,
//     stock_line,
//     stocktake,
//     stocktake_line,
//     store,
//     store_preference,
//     sync_buffer,
//     sync_file_reference,
//     sync_log,
//     sync_message,
//     system_log,
//     temperature_breach,
//     temperature_breach_config,
//     temperature_log,
//     unit,
//     user_account,
//     user_permission,
//     user_store_join,
//     vaccination,
//     vaccine_course,
//     vaccine_course_dose,
//     vaccine_course_item,
//     vvm_status,
//     vvm_status_log,
//     warning,
// );
