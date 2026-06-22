package resolvers

// Hand-written bootstrap resolvers (login + session + store/preferences), kept out of the
// generated schema.resolvers.go so `gqlgen generate` never clobbers them. The generated stubs
// delegate one line each to these (the invoices.go pattern). They back the frontend's
// connect→login→store-select→dashboard path.

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/msupply-foundation/open-msupply/server-go/internal/auth"
	"github.com/msupply-foundation/open-msupply/server-go/internal/graphql/model"
	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
)

const syncSiteIDKey = "SETTINGS_SYNC_SITE_ID"
const syncUsernameKey = "SETTINGS_SYNC_USERNAME"

// siteID returns the configured sync site id (the value login/me filter stores by).
func (r *queriesResolver) siteID() (*int32, error) {
	v, ok, err := repository.NewKeyValueStore(r.DB, r.Dialect).GetInt(syncSiteIDKey)
	if err != nil || !ok {
		return nil, err
	}
	id := int32(v)
	return &id, nil
}

// authToken verifies credentials (bcrypt) + site access, issues a token pair, sets the refresh
// cookie, and returns the AuthToken union member. Mirrors the Rust login resolver's local path.
func (r *queriesResolver) authToken(ctx context.Context, username, password string) (model.AuthTokenResponse, error) {
	invalid := model.AuthTokenError{Error: model.InvalidCredentials{Description: "Invalid username or password"}}

	user, err := repository.NewUserAccountRepository(r.DB, r.Dialect).FindOneByUsername(username)
	if err != nil {
		return nil, err
	}
	if user == nil || user.HashedPassword == "" {
		return invalid, nil
	}
	if err := auth.VerifyPassword(password, user.HashedPassword); err != nil {
		return invalid, nil
	}

	siteID, err := r.siteID()
	if err != nil {
		return nil, err
	}
	stores, err := repository.NewUserStoreRepository(r.DB, r.Dialect).StoresForUser(user.ID, siteID)
	if err != nil {
		return nil, err
	}
	if len(stores) == 0 {
		return model.AuthTokenError{Error: model.NoSiteAccess{Description: "User has no store access on this site"}}, nil
	}

	pair, err := auth.CreatePair(r.JWTSecret, user.ID)
	if err != nil {
		return nil, err
	}
	if w, ok := auth.ResponseWriter(ctx); ok {
		auth.SetRefreshTokenCookie(w, pair.Refresh, auth.RefreshTokenLifetime, r.SecureCookie)
	}
	return model.AuthToken{Token: pair.Token}, nil
}

// refreshToken issues a new pair from the refresh-token cookie.
func (r *queriesResolver) refreshToken(ctx context.Context) (model.RefreshTokenResponse, error) {
	token, ok := auth.RefreshToken(ctx)
	if !ok {
		return model.RefreshTokenError{Error: model.NoRefreshTokenProvided{Description: "No refresh token provided"}}, nil
	}
	pair, err := auth.RefreshPair(r.JWTSecret, token)
	if err != nil {
		return model.RefreshTokenError{Error: model.TokenExpired{Description: "Refresh token expired or invalid"}}, nil
	}
	if w, ok := auth.ResponseWriter(ctx); ok {
		auth.SetRefreshTokenCookie(w, pair.Refresh, auth.RefreshTokenLifetime, r.SecureCookie)
	}
	return model.RefreshToken{Token: pair.Token}, nil
}

// logout clears the refresh cookie.
func (r *queriesResolver) logout(ctx context.Context) (model.LogoutResponse, error) {
	if w, ok := auth.ResponseWriter(ctx); ok {
		auth.ClearRefreshTokenCookie(w)
	}
	uid, _ := auth.UserID(ctx)
	return model.Logout{UserID: uid}, nil
}

// me returns the authenticated user with their stores/defaultStore/permissions.
func (r *queriesResolver) me(ctx context.Context) (model.UserResponse, error) {
	userID, ok := auth.UserID(ctx)
	if !ok {
		return nil, fmt.Errorf("unauthenticated")
	}
	user, err := repository.NewUserAccountRepository(r.DB, r.Dialect).FindOneByID(userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}
	siteID, err := r.siteID()
	if err != nil {
		return nil, err
	}
	stores, err := repository.NewUserStoreRepository(r.DB, r.Dialect).StoresForUser(user.ID, siteID)
	if err != nil {
		return nil, err
	}
	perms, err := repository.NewUserPermissionRepository(r.DB, r.Dialect).ListByUserStore(user.ID, nil)
	if err != nil {
		return nil, err
	}

	node := &model.UserNode{
		UserID:      user.ID,
		Username:    user.Username,
		Email:       nsToPtr(user.Email),
		Language:    mapLanguage(user.Language),
		FirstName:   nsToPtr(user.FirstName),
		LastName:    nsToPtr(user.LastName),
		PhoneNumber: nsToPtr(user.PhoneNumber),
		JobTitle:    nsToPtr(user.JobTitle),
		Stores:      buildUserStoreConnector(stores),
		Permissions: buildPermissionConnector(perms),
	}
	for i := range stores {
		if stores[i].IsDefault {
			node.DefaultStore = userStoreNode(stores[i])
			break
		}
	}
	return node, nil
}

func (r *queriesResolver) isCentralServer(_ context.Context) (bool, error) {
	return false, nil
}

// stores lists all stores (no user filtering for the prototype, matching the Rust TODO).
func (r *queriesResolver) stores(_ context.Context) (model.StoresResponse, error) {
	rows, err := repository.NewStoreReadRepository(r.DB, r.Dialect).Query()
	if err != nil {
		return nil, err
	}
	nodes := make([]*model.StoreNode, 0, len(rows))
	for i := range rows {
		nodes = append(nodes, storeNode(&rows[i]))
	}
	return model.StoreConnector{TotalCount: len(nodes), Nodes: nodes}, nil
}

func (r *queriesResolver) store(_ context.Context, id string) (model.StoreResponse, error) {
	row, err := repository.NewStoreReadRepository(r.DB, r.Dialect).FindOneByID(id)
	if err != nil {
		return nil, err
	}
	if row == nil {
		return nil, fmt.Errorf("store %s not found", id)
	}
	return storeNode(row), nil
}

// initialisationStatus reports Initialised once a completed sync_log row exists (the seed
// provides one), so the frontend shows the login screen.
func (r *queriesResolver) initialisationStatus(_ context.Context) (*model.InitialisationStatusNode, error) {
	initialised, err := repository.NewStoreReadRepository(r.DB, r.Dialect).IsInitialised()
	if err != nil {
		return nil, err
	}
	if !initialised {
		return &model.InitialisationStatusNode{Status: model.InitialisationStatusTypePreInitialisation}, nil
	}
	node := &model.InitialisationStatusNode{Status: model.InitialisationStatusTypeInitialised}
	if name, ok, _ := repository.NewKeyValueStore(r.DB, r.Dialect).GetString(syncUsernameKey); ok {
		node.SiteName = &name
	}
	return node, nil
}

// preferences returns the global preferences with sane defaults (no DB needed for the
// prototype). Every non-null field must be set or gqlgen errors.
func (r *queriesResolver) preferences(_ context.Context, _ string) (*model.PreferencesNode, error) {
	return &model.PreferencesNode{
		GenderOptions:                  []model.GenderTypeNode{},
		CustomTranslations:             map[string]any{},
		GlobalTableConfigs:             map[string]any{},
		DaysInMonth:                    30,
		Backdating:                     &model.BackdatingNode{},
		WarnWhenMissingRecentStocktake: &model.WarnWhenMissingRecentStocktakeDataNode{},
		InvoiceStatusOptions:           []model.InvoiceNodeStatus{},
	}, nil
}

// --- helpers ---

func nsToPtr(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	s := ns.String
	return &s
}

func mapLanguage(s string) model.LanguageTypeNode {
	switch strings.ToUpper(s) {
	case "FRENCH":
		return model.LanguageTypeNodeFrench
	case "SPANISH":
		return model.LanguageTypeNodeSpanish
	case "LAOS":
		return model.LanguageTypeNodeLaos
	case "KHMER":
		return model.LanguageTypeNodeKhmer
	case "PORTUGUESE":
		return model.LanguageTypeNodePortuguese
	case "RUSSIAN":
		return model.LanguageTypeNodeRussian
	case "TETUM":
		return model.LanguageTypeNodeTetum
	default:
		return model.LanguageTypeNodeEnglish
	}
}

func mapStoreMode(s string) model.StoreModeNodeType {
	if strings.EqualFold(s, "DISPENSARY") {
		return model.StoreModeNodeTypeDispensary
	}
	return model.StoreModeNodeTypeStore
}

func userStoreNode(s repository.UserStore) *model.UserStoreNode {
	return &model.UserStoreNode{
		ID:          s.StoreID,
		Code:        s.Code,
		NameID:      s.NameID,
		Name:        s.StoreName,
		Preferences: defaultStorePreference(s.StoreID),
		StoreMode:   mapStoreMode(s.StoreMode),
		CreatedDate: nsToPtr(s.CreatedDate),
		IsDisabled:  s.IsDisabled,
	}
}

func buildUserStoreConnector(stores []repository.UserStore) *model.UserStoreConnector {
	nodes := make([]*model.UserStoreNode, 0, len(stores))
	for i := range stores {
		nodes = append(nodes, userStoreNode(stores[i]))
	}
	return &model.UserStoreConnector{TotalCount: len(nodes), Nodes: nodes}
}

func buildPermissionConnector(perms []repository.UserPermissionRow) *model.UserStorePermissionConnector {
	byStore := map[string][]model.UserPermission{}
	var order []string
	for _, p := range perms {
		sid := ""
		if p.StoreID.Valid {
			sid = p.StoreID.String
		}
		if _, seen := byStore[sid]; !seen {
			order = append(order, sid)
		}
		byStore[sid] = append(byStore[sid], model.UserPermission(p.Permission))
	}
	nodes := make([]*model.UserStorePermissionNode, 0, len(order))
	for _, sid := range order {
		nodes = append(nodes, &model.UserStorePermissionNode{Permissions: byStore[sid], StoreID: sid, Context: []string{}})
	}
	return &model.UserStorePermissionConnector{TotalCount: len(nodes), Nodes: nodes}
}

func storeNode(row *repository.StoreRead) *model.StoreNode {
	return &model.StoreNode{
		ID:          row.ID,
		Code:        row.Code,
		StoreName:   row.StoreName,
		SiteID:      int(row.SiteID),
		CreatedDate: nsToPtr(row.CreatedDate),
	}
}

// defaultStorePreference mirrors the store_preference DB defaults (months* sensible, rest off).
func defaultStorePreference(id string) *model.StorePreferenceNode {
	return &model.StorePreferenceNode{
		ID:                 id,
		MonthsOverstock:    6,
		MonthsUnderstock:   3,
		MonthsItemsExpire:  3,
		StocktakeFrequency: 1,
	}
}
