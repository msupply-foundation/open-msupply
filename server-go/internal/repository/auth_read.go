package repository

// Read repositories backing the auth/bootstrap resolvers (login, me, stores, permissions) and
// the site-access / initialisation checks. They follow the invoice.go read pattern (squirrel +
// dialect placeholder via syncPlaceholder) and read with *sql.DB.

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

// --- user_account ---

type UserAccountRow struct {
	ID             string
	Username       string
	HashedPassword string
	Email          sql.NullString
	Language       string
	FirstName      sql.NullString
	LastName       sql.NullString
	PhoneNumber    sql.NullString
	JobTitle       sql.NullString
}

type UserAccountRepository struct {
	conn    *sql.DB
	dialect db.Dialect
}

func NewUserAccountRepository(conn *sql.DB, d db.Dialect) *UserAccountRepository {
	return &UserAccountRepository{conn: conn, dialect: d}
}

func (r *UserAccountRepository) scan(q sq.SelectBuilder) (*UserAccountRow, error) {
	var u UserAccountRow
	err := q.RunWith(r.conn).QueryRow().Scan(&u.ID, &u.Username, &u.HashedPassword, &u.Email,
		&u.Language, &u.FirstName, &u.LastName, &u.PhoneNumber, &u.JobTitle)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserAccountRepository) cols() sq.SelectBuilder {
	return sq.Select("id", "username", "hashed_password", "email", "language",
		"first_name", "last_name", "phone_number", "job_title").
		From("user_account").PlaceholderFormat(syncPlaceholder(r.dialect))
}

func (r *UserAccountRepository) FindOneByUsername(username string) (*UserAccountRow, error) {
	return r.scan(r.cols().Where(sq.Eq{"username": username}))
}

func (r *UserAccountRepository) FindOneByID(id string) (*UserAccountRow, error) {
	return r.scan(r.cols().Where(sq.Eq{"id": id}))
}

// --- user's stores (user_store_join → store → name) ---

type UserStore struct {
	StoreID     string
	Code        string
	NameID      string
	StoreName   string
	SiteID      int32
	StoreMode   string
	CreatedDate sql.NullString
	IsDisabled  bool
	IsDefault   bool
}

type UserStoreRepository struct {
	conn    *sql.DB
	dialect db.Dialect
}

func NewUserStoreRepository(conn *sql.DB, d db.Dialect) *UserStoreRepository {
	return &UserStoreRepository{conn: conn, dialect: d}
}

// StoresForUser returns the stores a user is joined to; if siteID is non-nil, only those on that
// site (the "active on this site" filter used by login + me).
func (r *UserStoreRepository) StoresForUser(userID string, siteID *int32) ([]UserStore, error) {
	q := sq.Select("s.id", "s.code", "nl.name_id", "n.name", "s.site_id", "s.store_mode",
		"s.created_date", "s.is_disabled", "usj.is_default").
		From("user_store_join usj").
		Join("store s ON usj.store_id = s.id").
		Join("name_link nl ON s.name_link_id = nl.id").
		Join("name n ON nl.name_id = n.id").
		Where(sq.Eq{"usj.user_id": userID}).
		PlaceholderFormat(syncPlaceholder(r.dialect))
	if siteID != nil {
		q = q.Where(sq.Eq{"s.site_id": *siteID})
	}
	rows, err := q.RunWith(r.conn).Query()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []UserStore
	for rows.Next() {
		var s UserStore
		if err := rows.Scan(&s.StoreID, &s.Code, &s.NameID, &s.StoreName, &s.SiteID, &s.StoreMode,
			&s.CreatedDate, &s.IsDisabled, &s.IsDefault); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// --- user_permission ---

type UserPermissionRow struct {
	Permission string
	StoreID    sql.NullString
	ContextID  sql.NullString
}

type UserPermissionRepository struct {
	conn    *sql.DB
	dialect db.Dialect
}

func NewUserPermissionRepository(conn *sql.DB, d db.Dialect) *UserPermissionRepository {
	return &UserPermissionRepository{conn: conn, dialect: d}
}

func (r *UserPermissionRepository) ListByUserStore(userID string, storeID *string) ([]UserPermissionRow, error) {
	q := sq.Select("permission", "store_id", "context_id").From("user_permission").
		Where(sq.Eq{"user_id": userID}).PlaceholderFormat(syncPlaceholder(r.dialect))
	if storeID != nil {
		q = q.Where(sq.Eq{"store_id": *storeID})
	}
	rows, err := q.RunWith(r.conn).Query()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []UserPermissionRow
	for rows.Next() {
		var p UserPermissionRow
		if err := rows.Scan(&p.Permission, &p.StoreID, &p.ContextID); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// --- key_value_store helpers ---

type KeyValueStore struct {
	conn    *sql.DB
	dialect db.Dialect
}

func NewKeyValueStore(conn *sql.DB, d db.Dialect) *KeyValueStore {
	return &KeyValueStore{conn: conn, dialect: d}
}

func (r *KeyValueStore) GetInt(key string) (int64, bool, error) {
	q := sq.Select("value_int").From("key_value_store").Where(sq.Eq{"id": key}).
		PlaceholderFormat(syncPlaceholder(r.dialect))
	var v sql.NullInt64
	err := q.RunWith(r.conn).QueryRow().Scan(&v)
	if err == sql.ErrNoRows || !v.Valid {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return v.Int64, true, nil
}

func (r *KeyValueStore) GetString(key string) (string, bool, error) {
	q := sq.Select("value_string").From("key_value_store").Where(sq.Eq{"id": key}).
		PlaceholderFormat(syncPlaceholder(r.dialect))
	var v sql.NullString
	err := q.RunWith(r.conn).QueryRow().Scan(&v)
	if err == sql.ErrNoRows || !v.Valid {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return v.String, true, nil
}
