ALTER TABLE user_permission RENAME TO user_permission_with_user_id_constraint;

CREATE TABLE user_permission (
    id TEXT NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id),
    permission TEXT NOT NULL,
    context TEXT
);

INSERT INTO user_permission SELECT * FROM user_permission_with_user_id_constraint;

DROP TABLE IF EXISTS user_permission_with_user_id_constraint;
