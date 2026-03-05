SELECT
    item.id AS item_id,
    STRING_AGG(category.name, ', ') AS category_name
FROM item
INNER JOIN item_link ON item.id = item_link.item_id
INNER JOIN item_category_join ON item_category_join.item_link_id = item_link.id
INNER JOIN category ON category.id = item_category_join.category_id
WHERE item_category_join.deleted_datetime IS NULL
  AND category.deleted_datetime IS NULL
GROUP BY item.id
