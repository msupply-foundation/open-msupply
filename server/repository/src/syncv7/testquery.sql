WITH changelog_deduped_fast AS (
    SELECT *
    FROM (
            SELECT cursor,
                table_name,
                record_id,
                row_action,
                changelog.name_link_id,
                store_id,
                is_sync_update,
                source_site_id,
                ROW_NUMBER() OVER (
                    PARTITION BY record_id
                    ORDER BY cursor DESC
                ) AS rn
            FROM changelog
            WHERE record_id in 
                (
        SELECT `changelog`.`record_id` FROM ((((`changelog` LEFT OUTER JOIN `store` ON (`store`.`id` = `changelog`.`store_id`)) LEFT OUTER JOIN `store` AS `transfer_stores` ON (`transfer_stores`.`name_link_id` = `changelog`.`name_link_id`)) LEFT OUTER JOIN `name_store_join` ON (`name_store_join`.`name_link_id` = `changelog`.`name_link_id`)) LEFT OUTER JOIN `store` AS `name_join_stores` ON (`name_join_stores`.`id` = `name_store_join`.`store_id`)) WHERE ((((((`changelog`.`table_name` IN ('stock_line', 'invoice', 'invoice_line')) AND (`transfer_stores`.`site_id` = 18)) OR (`changelog`.`table_name` IN ('unit', 'currency', 'name', 'store', 'location_type', 'item'))) OR ((`changelog`.`table_name` IN ('stock_line', 'invoice', 'invoice_line')) AND (`store`.`site_id` = 18))) AND (`changelog`.`row_action` != 'delete')) AND (`changelog`.`cursor` > 396658))
                )
            )
    WHERE rn = 1)
    SELECT * FROM (
        SELECT `changelog_deduped_fast`.`cursor`, `changelog_deduped_fast`.`table_name`, `changelog_deduped_fast`.`record_id`, `changelog_deduped_fast`.`row_action`, `changelog_deduped_fast`.`name_link_id`, `changelog_deduped_fast`.`store_id`, `changelog_deduped_fast`.`is_sync_update`, `changelog_deduped_fast`.`source_site_id` FROM `changelog_deduped_fast` ORDER BY `changelog_deduped_fast`.`cursor` ASC LIMIT 5000
    )
         -- binds: [stock_line, invoice, invoice_line, 18, unit, currency, name, store, location_type, item, stock_line, invoice, invoice_line, 18, delete, 396658, 5000]