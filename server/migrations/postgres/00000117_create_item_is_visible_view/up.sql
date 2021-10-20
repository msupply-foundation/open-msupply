-- should be item_is_visible_in_store
CREATE VIEW item_is_visible AS
SELECT
    item.id,
    max(master_list_name_join.id) IS NOT NULL is_visible
FROM
    item
    LEFT JOIN master_list_line ON item.id = master_list_line.item_id
    LEFT JOIN master_list_name_join ON master_list_line.master_list_id = master_list_name_join.master_list_id
GROUP BY
    item.id
