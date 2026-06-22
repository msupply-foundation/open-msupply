// Package graphql wires the generated gqlgen executable schema to the resolver + DB.
package graphql

import (
	"database/sql"
	"net/http"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/graphql/generated"
	"github.com/msupply-foundation/open-msupply/server-go/internal/graphql/loaders"
	"github.com/msupply-foundation/open-msupply/server-go/internal/graphql/resolvers"
)

// Config holds the per-server auth/CORS settings.
type Config struct {
	JWTSecret    []byte
	AllowOrigin  string // exact frontend origin for CORS, e.g. http://localhost:3003
	SecureCookie bool   // false on dev (plain HTTP) so the refresh cookie is stored
}

// NewHandler returns an http.Handler serving /graphql backed by the given DB. The middleware
// chain is (outer→inner) cors → authContext → loaders → gqlgen, so each request has CORS
// headers, an auth context (user id / refresh token / writer), and fresh per-request DataLoaders.
func NewHandler(conn *sql.DB, dialect db.Dialect, cfg Config) http.Handler {
	es := generated.NewExecutableSchema(generated.Config{
		Resolvers: &resolvers.Resolver{
			DB:           conn,
			Dialect:      dialect,
			JWTSecret:    cfg.JWTSecret,
			SecureCookie: cfg.SecureCookie,
		},
	})
	var h http.Handler = handler.NewDefaultServer(es)
	h = loaders.Middleware(conn, dialect, h)
	h = authContextMiddleware(cfg.JWTSecret, h)
	h = corsMiddleware(cfg.AllowOrigin, h)
	return h
}
