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

// NewHandler returns an http.Handler serving /graphql backed by the given DB. Each request is
// wrapped with fresh DataLoaders so per-request batching (N+1 prevention) works.
func NewHandler(conn *sql.DB, dialect db.Dialect) http.Handler {
	es := generated.NewExecutableSchema(generated.Config{
		Resolvers: &resolvers.Resolver{DB: conn, Dialect: dialect},
	})
	return loaders.Middleware(conn, dialect, handler.NewDefaultServer(es))
}
