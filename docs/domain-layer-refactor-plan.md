# Domain Layer Refactor Plan

## Overview

Introduce a domain layer between service and repository layers to centralize business logic and ensure consistent side effects for invoice operations.

**Problem**: Invoice line updates require manual coordination of side effects (stock adjustments, picked date updates) scattered across service layer, leading to bugs.

**Solution**: Domain layer with event-driven side effects that execute atomically.

## Architecture

```
Service Layer -> Domain Layer -> Repository Layer
                     ↓
               Event Processing
```

## Implementation Phases

### Phase 1: Domain Foundation ✅ (when completed)

Create the basic domain layer structure without breaking existing functionality.

#### 1.1 Create Domain Module Structure

- [x] Create `server/domain/` directory
- [x] Create `server/domain/mod.rs`
- [x] Create `server/domain/events.rs`
- [x] Create `server/domain/invoice_line/` directory
- [x] Add domain module to `server/service/Cargo.toml` dependencies

#### 1.2 Define Domain Events

- [ ] Create `DomainEvent` enum in `events.rs`
- [ ] Define events for:
  - Stock adjustments
  - Picked date updates
  - Other invoice line side effects

#### 1.3 Create Domain Models

- [ ] Create `InvoiceLineDomain` in `server/domain/invoice_line/domain_model.rs`
- [ ] Implement business logic methods (update_number_of_packs, etc.)
- [ ] Add event generation logic

#### 1.4 Create Domain Service

- [ ] Create `InvoiceLineDomainService` in `server/domain/invoice_line/domain_service.rs`
- [ ] Implement event execution logic
- [ ] Add transaction coordination

### Phase 2: Migrate Update Stock Out Line ✅ (when completed)

Replace the existing `update_stock_out_line` service with domain layer implementation.

#### 2.1 Extract Business Logic

- [ ] Move validation logic from service to domain model
- [ ] Move side effect logic from service to domain events
- [ ] Create domain method for stock out line updates

#### 2.2 Update Service Layer

- [ ] Modify `update_stock_out_line` to use domain service
- [ ] Remove manual repository orchestration
- [ ] Ensure error handling is preserved

#### 2.3 Testing

- [ ] Update existing tests to work with domain layer
- [ ] Add unit tests for domain model business logic
- [ ] Add integration tests for domain service
- [ ] Verify all existing functionality works

### Phase 3: Expand to Other Operations ⏳ (future phases)

Gradually migrate other invoice line operations.

#### Operations to migrate:

- [ ] Insert stock out line
- [ ] Delete stock out line
- [ ] Update stock in line
- [ ] Insert stock in line
- [ ] Delete stock in line

### Phase 4: Cleanup ⏳ (future phases)

Remove redundant code and optimize.

#### 4.1 Service Layer Cleanup

- [ ] Remove duplicate business logic from services
- [ ] Simplify service methods to thin wrappers
- [ ] Update service interfaces if needed

#### 4.2 Repository Optimizations

- [ ] Review if any repository methods can be simplified
- [ ] Consider batching operations where beneficial

## Technical Decisions

### Event Processing

- **Synchronous execution**: Events processed immediately in same transaction
- **Atomic operations**: All changes (main + side effects) succeed or fail together
- **Error handling**: Domain errors bubble up to service layer

### Domain Model Design

- **Wrapper pattern**: Domain models wrap repository rows
- **Immutable updates**: Methods return new state + events
- **Business rule encapsulation**: All invoice line business logic in domain

### Invoice Type Variation Handling

Different invoice types have different business rules for side effects:

- **InboundShipment**: Always creates new stock lines, updates stock levels when invoice affects stock
- **InventoryAddition**: Adds to existing stock lines, always updates stock
- **CustomerReturn**: Conditional behavior based on existing stock line presence
- **OutboundShipment**: Reduces stock levels, may update picked dates

**Implementation Strategy**: Enum-based business rules in domain model rather than strategy pattern for simplicity. Business logic encapsulated in domain model methods that match on `(invoice_type, invoice_status)` combinations.

**Example Pattern**:

```rust
match (&self.invoice.r#type, &self.invoice.status) {
    (InvoiceType::InboundShipment, status) if status.affects_stock() => {
        vec![DomainEvent::StockCreated { /* ... */ }]
    },
    (InvoiceType::InventoryAddition, _) => {
        vec![DomainEvent::StockAdjusted { /* ... */ }]
    },
    // etc.
}
```

### Testing Strategy

- **Unit tests**: Domain model business logic (pure functions)
- **Integration tests**: Domain service with repository layer
- **Existing tests**: Should continue passing with minimal changes

## File Structure

```
server/
├── domain/
│   ├── mod.rs
│   ├── events.rs
│   └── invoice_line/
│       ├── mod.rs
│       ├── domain_model.rs
│       └── domain_service.rs
├── service/
│   └── src/
│       └── invoice_line/
│           └── stock_out_line/
│               └── update/
│                   └── mod.rs (modified)
└── repository/
    └── (unchanged)
```

## Current Status

**Phase**: 1.2 - Define domain events (Ready to implement actual repository operations)
**Next Step**: Implement the todo!() placeholders in domain service event processing
**Blockers**: None

**Recent Progress**:

- ✅ Phase 1.1 Complete - Created complete domain module structure
- ✅ Added domain dependency to service Cargo.toml
- ✅ Implemented DomainEvent enum with StockAdded/StockReduced/StockCreated events
- ✅ Created InvoiceLineDomain model with business logic for different invoice types
- ✅ Created InvoiceLineDomainService with event processing framework

**Ready for**: Phase 1.2 - Implementing actual repository operations in event processing

## Notes

- Keep existing service APIs unchanged during migration
- Ensure backward compatibility throughout
- All changes should be incremental and testable
- Document any breaking changes or new patterns
