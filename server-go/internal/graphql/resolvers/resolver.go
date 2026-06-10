package resolvers

import (
	"database/sql"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

// Resolver is the dependency-injection root for the GraphQL layer.
type Resolver struct {
	DB      *sql.DB
	Dialect db.Dialect
}
