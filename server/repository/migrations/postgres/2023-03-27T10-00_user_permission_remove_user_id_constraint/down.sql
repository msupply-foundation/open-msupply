ALTER TABLE user_permission ADD CONSTRAINT user_permission_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_account(id) MATCH FULL;
