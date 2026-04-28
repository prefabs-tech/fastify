# @prefabs.tech/fastify-slonik Complete Features Reference

A comprehensive Fastify plugin providing PostgreSQL database integration via Slonik with automatic migrations, type safety, and CRUD scaffolding. This document details every feature, capability, configuration option, and fix added by this plugin.

**Version**: 0.93.5  
**License**: MIT

---

## Table of Contents

1. [Connection & Initialization](#1-connection--initialization)
2. [Core CRUD Operations](#2-core-crud-operations)
3. [Soft Delete Support](#3-soft-delete-support)
4. [Filtering System](#4-filtering-system)
5. [Sorting & Pagination](#5-sorting--pagination)
6. [Service Hooks](#6-service-hooks-pre--post-operations)
7. [Field Name Conversion](#7-field-name-conversion-camelcase--snake_case)
8. [Database Migrations](#8-database-migrations)
9. [SQL Factory & Generation](#9-sql-factory--generation)
10. [Data Transformation & Type Safety](#10-data-transformation--type-safety)
11. [Utilities & Helpers](#11-utilities--helpers)
12. [Special Behaviors & Optimizations](#12-special-behaviors--optimizations)
13. [Feature Matrix](#feature-matrix)
14. [Developer Workflow Example](#developer-workflow-example)
15. [Configuration Reference](#configuration-reference)
16. [Feature Checklist](#feature-checklist-for-developers)
17. [Performance Considerations](#performance-considerations)
18. [Automatic vs Manual](#whats-automatically-handled)

---

## 1. CONNECTION & INITIALIZATION

### 1.1 PostgreSQL Connection Pool Management

**What it does**: Automatically establishes and maintains a connection pool to PostgreSQL with automatic retry logic.

**Features**:

- Connection retry logic: 3 automatic retries on connection failures
- Configurable pool size: Default max 10 connections
- Connection timeout: 5 seconds
- Query retry limit: 5 attempts
- Transaction retry limit: 5 attempts
- Statement timeout: 60 seconds
- Idle connection management: 5 second idle timeout, 60 second idle-in-transaction timeout

**How developers use it**:

```typescript
import slonikPlugin from "@prefabs.tech/fastify-slonik";
import Fastify from "fastify";

const fastify = Fastify();
await fastify.register(slonikPlugin, {
  db: {
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "password",
    databaseName: "myapp",
  },
});

// Connection pool automatically created with retry logic
```

**Internal config defaults**:

- `captureStackTrace: false`
- `connectionRetryLimit: 3`
- `connectionTimeout: 5000` ms
- `idleInTransactionSessionTimeout: 60000` ms
- `idleTimeout: 5000` ms
- `maximumPoolSize: 10`
- `queryRetryLimit: 5`
- `statementTimeout: 60000` ms
- `transactionRetryLimit: 5`

---

### 1.2 Fastify Decorators (Instance-Level)

**What it does**: Provides database access through Fastify instance decorators available globally.

**Decorators added to `fastify`**:

- `fastify.slonik` - Database object with pool and query methods
- `fastify.sql` - Slonik SQL template tag for safe query building
- `fastify.config` - ApiConfig containing slonik configuration

**Usage**:

```typescript
fastify.get("/users", async (req, reply) => {
  // Access via fastify instance
  const users = await fastify.slonik.pool.any(fastify.sql`SELECT * FROM users`);
  return users;
});
```

---

### 1.3 Request-Level Database Access (Request Decorators)

**What it does**: Automatically injects database access into every request, avoiding need to pass context.

**Decorators added to `req`**:

- `req.slonik` - Same database object as fastify.slonik
- `req.sql` - Slonik SQL template tag
- `req.dbSchema` - Schema name (customizable per request, defaults to empty string for public schema)

**Implementation**: Registered via `onRequest` hook that fires on every request

**Usage**:

```typescript
fastify.post("/articles", async (req, reply) => {
  // req.slonik and req.sql available automatically
  const article = await req.slonik.pool.one(
    req.sql`
      INSERT INTO articles (title, content) 
      VALUES (${req.body.title}, ${req.body.content})
      RETURNING *
    `,
  );
  return article;
});
```

---

### 1.4 Connection Testing on Startup

**What it does**: Verifies database connectivity when plugin initializes.

**How it works**:

- Executes a test connection: `db.pool.connect(async () => {})`
- Throws error if connection fails, preventing app from starting with bad config
- Ensures database is reachable before accepting requests

---

## 2. CORE CRUD OPERATIONS

### 2.1 BaseService Foundation Class

**What it does**: Abstract base class providing ready-made CRUD operations to avoid repetitive boilerplate.

**How to use**:

```typescript
import BaseService from "@prefabs.tech/fastify-slonik";
import type { Database } from "@prefabs.tech/fastify-slonik";

class UserService extends BaseService<User, CreateUserInput, UpdateUserInput> {
  static readonly TABLE = "users";

  constructor(config: ApiConfig, database: Database) {
    super(config, database);
  }
}

// In route handler
const userService = new UserService(config, fastify.slonik);
```

**Generic Parameters**:

- `T` - Entity type (what's returned from database)
- `C` - Creation input type (what's passed to create)
- `U` - Update input type (what's passed to update)

**Required static property**:

- `TABLE: string` - Name of the database table

**Optional static properties for defaults**:

- `LIMIT_DEFAULT: number` - Default page size (default: 20)
- `LIMIT_MAX: number` - Maximum allowable page size (default: 50)
- `SORT_DIRECTION: "ASC" | "DESC"` - Default sort direction (default: "ASC")
- `SORT_KEY: string` - Default sort column (default: "id")

---

### 2.2 Read Operations

#### create(data: C): Promise<T | undefined>

Creates a new record and returns it.

```typescript
const newUser = await userService.create({
  name: "John Doe",
  email: "john@example.com",
  age: 30,
});
```

**Features**:

- Automatically includes `preCreate` hook
- Automatically includes `postCreate` hook
- Returns undefined if creation fails
- Only includes fields with valid ValueExpression types (null, string, number, boolean, Date, Buffer, arrays)

---

#### read(id: string | number): Promise<T | null>

Retrieves a single record by ID.

```typescript
const user = await userService.findById(1);
// Returns user object or null if not found
```

**Aliases**: `findById()` is the actual method name

---

#### find(filters?: FilterInput, sort?: SortInput[]): Promise<readonly T[]>

Retrieves all records matching optional filters with optional sorting.

```typescript
// Get all users
const allUsers = await userService.find();

// Get with filters
const admins = await userService.find({
  key: "role",
  operator: "eq",
  value: "admin",
});

// Get with sorting
const sorted = await userService.find(undefined, [
  { key: "createdAt", direction: "DESC" },
  { key: "name", direction: "ASC" },
]);
```

**Features**:

- No pagination applied (returns all matching records)
- Supports multiple filters combined with AND/OR
- Supports multi-column sorting
- Default sort: ORDER BY id ASC
- Excludes soft-deleted records if soft delete enabled

---

#### findOne(filters?: FilterInput, sort?: SortInput[]): Promise<T | null>

Retrieves first matching record or null.

```typescript
const admin = await userService.findOne({
  key: "role",
  operator: "eq",
  value: "admin",
});
```

**Features**:

- Uses LIMIT 1 for efficiency
- Returns null if no match found
- Respects sorting order

---

#### all(fields: string[], sort?: SortInput[]): Promise<Partial<readonly T[]>>

Retrieves all records with only specified fields (useful for dropdowns/selects).

```typescript
// Get just id and name for a country selector
const countries = await userService.all(["id", "name"]);
// Returns: [{ id: 1, name: "USA" }, { id: 2, name: "Canada" }]
```

**Features**:

- No pagination
- Field projection for smaller payloads
- Reduces data transfer

---

#### count(filters?: FilterInput): Promise<number>

Returns total count of records matching optional filters.

```typescript
const totalUsers = await userService.count();
const activeUsers = await userService.count({
  key: "status",
  operator: "eq",
  value: "active",
});
```

---

#### list(limit?: number, offset?: number, filters?: FilterInput, sort?: SortInput[]): Promise<PaginatedList<T>>

Retrieves paginated results with count information.

```typescript
const result = await userService.list(
  20, // limit (capped at maxLimit)
  0, // offset
  { key: "status", operator: "eq", value: "active" }, // filters
  [{ key: "createdAt", direction: "DESC" }], // sort
);

// Returns:
// {
//   totalCount: 1500,      // Total records in table
//   filteredCount: 234,    // Records matching filter
//   data: [...]            // Paginated result set
// }
```

**Features**:

- Enforces limit constraints (capped at maxLimit from config)
- Returns totalCount (for total record count)
- Returns filteredCount (for filtered subset count)
- Returns data array
- Respects filter and sort parameters

---

### 2.3 Write Operations

#### update(id: string | number, data: U): Promise<T>

Updates record by ID and returns updated record.

```typescript
const updated = await userService.update(1, {
  name: "Jane Doe",
  status: "active",
});
```

**Features**:

- Triggers `preUpdate` hook for data transformation
- Triggers `postUpdate` hook for output transformation
- Returns updated record from database
- Only includes fields with valid ValueExpression types

---

#### delete(id: string | number, force?: boolean): Promise<T | null>

Deletes record by ID (soft or hard delete depending on configuration).

```typescript
// Soft delete (if enabled)
await userService.delete(1);

// Force hard delete even if soft delete enabled
await userService.delete(1, true);
```

**Features**:

- Respects soft delete configuration
- If soft delete enabled: sets deleted_at timestamp, keeps record in database
- If soft delete disabled or force=true: permanently removes record
- Triggers `preDelete` hook for validation
- Triggers `postDelete` hook for cleanup
- Returns deleted record or null

---

## 3. SOFT DELETE SUPPORT

### 3.1 Enabling Soft Deletes

**What it does**: Marks records as deleted with timestamp instead of permanently removing them.

**How to enable**:

```typescript
class UserService extends BaseService<User, CreateUserInput, UpdateUserInput> {
  static readonly TABLE = "users";

  constructor(config: ApiConfig, database: Database) {
    super(config, database);
    this._softDeleteEnabled = true; // Enable soft deletes
  }
}
```

**Prerequisite**: Database table must have `deleted_at` column (timestamp nullable).

---

### 3.2 Automatic Soft Delete Filtering

**What it does**: When soft delete is enabled, all queries automatically exclude deleted records.

**Affected methods**:

- `findById()` - Excludes soft-deleted records
- `find()` - Excludes soft-deleted records
- `findOne()` - Excludes soft-deleted records
- `all()` - Excludes soft-deleted records
- `count()` - Excludes soft-deleted records
- `list()` - Excludes soft-deleted records

**Generated SQL**:

- Adds `WHERE deleted_at IS NULL` filter automatically
- Developer doesn't need to remember to exclude deleted records
- All queries work as if deleted records don't exist

---

### 3.3 Forcing Hard Delete

**What it does**: Permanently removes record even if soft delete enabled.

```typescript
// Soft delete (sets deleted_at)
await userService.delete(userId);

// Force hard delete (permanent removal)
await userService.delete(userId, true);
```

---

## 4. FILTERING SYSTEM

### 4.1 Overview

**What it does**: Provides 11+ filter operators for building flexible WHERE clauses with AND/OR logic, all parameterized to prevent SQL injection.

**Basic Filter Structure**:

```typescript
type BaseFilterInput = {
  key: string; // Field name to filter on
  operator: operator; // One of 11 operators (see below)
  value: string; // Filter value as string
  not?: boolean; // Optional: negate the operator
  insensitive?: boolean; // Optional: case-insensitive matching
};

type FilterInput =
  | BaseFilterInput
  | { AND: FilterInput[] } // Combine multiple filters with AND
  | { OR: FilterInput[] }; // Combine multiple filters with OR
```

---

### 4.2 Equality Operator (eq)

**Operator**: `"eq"`
**SQL Generated**: `=` or `IS NULL`
**Use**: Match exact values

```typescript
// Simple equality
const admins = await userService.find({
  key: "role",
  operator: "eq",
  value: "admin",
});

// NULL check (special handling)
const deleted = await userService.find({
  key: "deletedAt",
  operator: "eq",
  value: "null", // Check IS NULL
});

// Negate (not equal)
const nonAdmins = await userService.find({
  key: "role",
  operator: "eq",
  value: "admin",
  not: true, // Inverts to !=
});
```

---

### 4.3 Case-Insensitive Equality

**Operator**: `"eq"` with `insensitive: true`
**SQL Generated**: `LOWER(unaccent(column)) = LOWER(unaccent(value))`
**Use**: Match values ignoring case and accents

```typescript
const user = await userService.findOne({
  key: "email",
  operator: "eq",
  value: "JOHN@EXAMPLE.COM",
  insensitive: true, // Matches "john@example.com"
});

// Works with accents too
const person = await userService.find({
  key: "name",
  operator: "eq",
  value: "jose",
  insensitive: true, // Matches "José" (requires unaccent extension)
});
```

**Prerequisite**: `insensitive` feature requires PostgreSQL `unaccent` extension (automatically created by plugin).

---

### 4.4 String Pattern Operators

#### Contains (ct)

**Operator**: `"ct"`
**SQL Generated**: `ILIKE '%value%'`
**Use**: Match substring anywhere in field

```typescript
const results = await userService.find({
  key: "name",
  operator: "ct",
  value: "john",
});
// Matches: "John", "johnny", "John Doe", "benjamin"
```

---

#### Starts With (sw)

**Operator**: `"sw"`
**SQL Generated**: `ILIKE 'value%'`
**Use**: Match string prefix

```typescript
const results = await userService.find({
  key: "email",
  operator: "sw",
  value: "admin@",
});
// Matches: "admin@example.com", "admin@company.org"
```

---

#### Ends With (ew)

**Operator**: `"ew"`
**SQL Generated**: `ILIKE '%value'`
**Use**: Match string suffix

```typescript
const results = await userService.find({
  key: "email",
  operator: "ew",
  value: "@example.com",
});
// Matches: "john@example.com", "jane@example.com"
```

---

### 4.5 Comparison Operators

#### Greater Than (gt)

**Operator**: `"gt"`
**SQL Generated**: `> value`
**Use**: Numeric and date comparisons

```typescript
const recentArticles = await userService.find({
  key: "createdAt",
  operator: "gt",
  value: "2024-01-01",
});
```

---

#### Greater Than or Equal (gte)

**Operator**: `"gte"`
**SQL Generated**: `>= value`

```typescript
const adults = await userService.find({
  key: "age",
  operator: "gte",
  value: "18",
});
```

---

#### Less Than (lt)

**Operator**: `"lt"`
**SQL Generated**: `< value`

```typescript
const affordable = await userService.find({
  key: "price",
  operator: "lt",
  value: "100",
});
```

---

#### Less Than or Equal (lte)

**Operator**: `"lte"`
**SQL Generated**: `<= value`

```typescript
const limitedStock = await userService.find({
  key: "stock",
  operator: "lte",
  value: "10",
});
```

---

### 4.6 IN Operator

**Operator**: `"in"`
**SQL Generated**: `IN (value1, value2, ...)`
**Use**: Match any value from a list

```typescript
// Find users with specific roles (comma-separated values)
const results = await userService.find({
  key: "role",
  operator: "in",
  value: "admin,moderator,editor",
});

// Negate to get NOT IN
const nonStaff = await userService.find({
  key: "status",
  operator: "in",
  value: "inactive,banned",
  not: true, // Converts to NOT IN
});
```

---

### 4.7 BETWEEN Operator

**Operator**: `"bt"`
**SQL Generated**: `BETWEEN start AND end`
**Use**: Range filtering for numbers and dates

```typescript
// Date range
const articles = await userService.find({
  key: "publishedAt",
  operator: "bt",
  value: "2024-01-01,2024-12-31", // comma-separated start,end
});

// Price range
const products = await userService.find({
  key: "price",
  operator: "bt",
  value: "10,100",
});
```

---

### 4.8 Geographic Distance Operator (PostGIS)

**Operator**: `"dwithin"`
**SQL Generated**: `ST_DWithin(geometry_column, ST_Point(long, lat), radius)`
**Use**: Find records within geographic radius

```typescript
const nearbyStores = await storeService.find({
  key: "location", // Geographic point column
  operator: "dwithin",
  value: "40.7128,-74.0060,5000", // latitude,longitude,radius_in_meters
});
// Returns stores within 5km of NYC coordinates
```

**Prerequisite**: Requires PostgreSQL PostGIS extension (can be enabled in config).

**Format**: `"latitude,longitude,radius_in_meters"`

---

### 4.9 Negation

**Feature**: All operators can be inverted with `not` flag

```typescript
// NOT equal
const admins = await userService.find({
  key: "role",
  operator: "eq",
  value: "admin",
  not: true, // NOT role = 'admin'
});

// NOT contains
const excluded = await userService.find({
  key: "name",
  operator: "ct",
  value: "spam",
  not: true, // Names NOT containing 'spam'
});

// NOT in
const active = await userService.find({
  key: "status",
  operator: "in",
  value: "inactive,banned",
  not: true, // NOT IN clause
});
```

---

### 4.10 Combining Filters with AND/OR

#### AND Logic

```typescript
// Multiple conditions all must be true
const activeAdmins = await userService.find({
  AND: [
    { key: "role", operator: "eq", value: "admin" },
    { key: "status", operator: "eq", value: "active" },
  ],
});
// WHERE role = 'admin' AND status = 'active'
```

#### OR Logic

```typescript
// Any condition can be true
const important = await userService.find({
  OR: [
    { key: "priority", operator: "eq", value: "high" },
    { key: "priority", operator: "eq", value: "urgent" },
  ],
});
// WHERE priority = 'high' OR priority = 'urgent'
```

#### Complex Nested Filters

```typescript
// (role = admin AND status = active) OR (role = moderator AND status = active)
const active = await userService.find({
  OR: [
    {
      AND: [
        { key: "role", operator: "eq", value: "admin" },
        { key: "status", operator: "eq", value: "active" },
      ],
    },
    {
      AND: [
        { key: "role", operator: "eq", value: "moderator" },
        { key: "status", operator: "eq", value: "active" },
      ],
    },
  ],
});
```

---

### 4.11 Accent-Insensitive Filtering

**Feature**: Remove accents from characters during comparison

```typescript
// Finds "José", "jose", "Jóse", "JOSÉ" all the same
const user = await userService.find({
  key: "name",
  operator: "ct",
  value: "jose",
  insensitive: true, // Enables unaccent
});
```

**How it works**:

- Wraps filter value in PostgreSQL `unaccent()` function
- Wraps database column in `unaccent()` function
- Case-insensitive comparison via `LOWER()`
- Requires PostgreSQL `unaccent` extension

**Prerequisite**: Plugin automatically creates `unaccent` extension on startup.

---

### 4.12 Filtering Auto-Conversion (camelCase to snake_case)

**What it does**: Automatically converts JavaScript field names to database column names.

```typescript
// API input uses camelCase
const users = await userService.find({
  key: "createdAt", // camelCase in API
  operator: "gt",
  value: "2024-01-01",
});

// Plugin converts to created_at automatically for SQL
// SELECT * FROM users WHERE created_at > '2024-01-01'
```

---

## 5. SORTING & PAGINATION

### 5.1 Multi-Column Sorting

**What it does**: Sort results by one or more columns in ascending or descending order.

```typescript
// Sort by createdAt DESC, then name ASC
const users = await userService.find(
  undefined, // filters
  [
    { key: "createdAt", direction: "DESC" },
    { key: "name", direction: "ASC" },
  ],
);
// Generated SQL: ORDER BY created_at DESC, name ASC
```

**SortInput Type**:

```typescript
type SortInput = {
  key: string; // Column name
  direction: "ASC" | "DESC"; // Sort direction
  insensitive?: boolean; // Case-insensitive sorting
};
```

---

### 5.2 Default Sorting

**What it does**: If no sort specified, automatically sorts by ID ascending.

```typescript
const users = await userService.find(); // Defaults to ORDER BY id ASC
```

**Customizable defaults**:

```typescript
class CustomService extends DefaultSqlFactory {
  static readonly SORT_KEY = "createdAt";
  static readonly SORT_DIRECTION = "DESC";
  // Now defaults to ORDER BY created_at DESC
}
```

---

### 5.3 Case-Insensitive Sorting

**What it does**: Sort strings ignoring case differences.

```typescript
const users = await userService.find(undefined, [
  { key: "name", direction: "ASC", insensitive: true },
]);
// Uses: LOWER(name) ASC
```

---

### 5.4 Offset-Based Pagination

**What it does**: Paginate through results using limit and offset.

```typescript
// Page 1: limit=20, offset=0
const page1 = await userService.list(20, 0);

// Page 2: limit=20, offset=20
const page2 = await userService.list(20, 20);

// Page 3: limit=20, offset=40
const page3 = await userService.list(20, 40);
```

**Generated SQL**: `LIMIT 20 OFFSET 0`

---

### 5.5 Pagination Limit Enforcement

**What it does**: Enforce maximum record limits to prevent resource exhaustion.

```typescript
// Request 100 records, but only get max 50 (default maxLimit)
const result = await userService.list(100, 0);
// Returns only 50 records, not 100
```

**Configuration**:

```typescript
const config = {
  slonik: {
    pagination: {
      defaultLimit: 20, // If limit not specified
      maxLimit: 50, // Hard cap on limit
    },
  },
};
```

**Behavior**:

- If limit not provided: uses defaultLimit (20)
- If limit exceeds maxLimit: capped at maxLimit
- Prevents developers from requesting massive datasets accidentally

---

### 5.6 Paginated List with Counts

**What it does**: Get paginated results with comprehensive count information.

```typescript
const result = await userService.list(
  10, // limit
  0, // offset
  { key: "status", operator: "eq", value: "active" },
  [{ key: "createdAt", direction: "DESC" }],
);

// Returns object with:
console.log(result.totalCount); // Total records in table
console.log(result.filteredCount); // Records matching filter
console.log(result.data); // Paginated result set (10 records)
```

**Use Cases**:

- UI pagination: Show "Showing 1-10 of 234 active users"
- Understand dataset size: Know if need to show next page button
- Analytics: Count filtered vs total records

---

## 6. SERVICE HOOKS (PRE & POST OPERATIONS)

### 6.1 Pre-Operation Hooks

**What it does**: Transform or validate input before database operations execute.

**Available Pre-Hooks**:

#### preCreate(data: C): Promise<C | undefined>

Called before INSERT operation.

```typescript
class UserService extends BaseService<User, CreateUserInput, UpdateUserInput> {
  static readonly TABLE = "users";

  protected async preCreate(data: CreateUserInput) {
    // Hash password before creating
    return {
      ...data,
      password: await bcrypt.hash(data.password, 10),
      email: data.email.toLowerCase(),
    };
  }
}
```

**Use Cases**:

- Password hashing
- Email normalization
- Default value assignment
- Validation (throw error to reject)
- Data enrichment

---

#### preUpdate(data: U): Promise<U | undefined>

Called before UPDATE operation.

```typescript
protected async preUpdate(data: UpdateUserInput) {
  return {
    ...data,
    email: data.email?.toLowerCase(),
    updatedAt: new Date(),
  };
}
```

---

#### preDelete(id: string | number): Promise<void>

Called before DELETE operation (no return value).

```typescript
protected async preDelete(id: number) {
  const user = await this.findById(id);

  // Validation: prevent deleting last admin
  if (user?.role === "admin" && await this.isLastAdmin()) {
    throw new Error("Cannot delete the last admin user");
  }
}
```

**Use Cases**:

- Validation before destructive operations
- Preventing deletion of critical records
- Checking permissions
- Cleanup of related data

---

#### preFind(), preFindById(id), preFindOne(): Promise<void>

Called before SELECT operations (no parameters or return value).

```typescript
protected async preFindById(id: number) {
  // Log access for audit trail
  await auditLog.record("user_accessed", { userId: id });
}
```

---

#### preAll(), preCount(), preList(): Promise<void>

Additional pre-hooks for other operations.

---

### 6.2 Post-Operation Hooks

**What it does**: Transform or enrich output after database operations complete.

**Available Post-Hooks**:

#### postFindById(result: T): Promise<T>

Called after SELECT by ID, can modify returned record.

```typescript
protected async postFindById(user: User) {
  // Strip sensitive fields from returned user
  const { password, twoFactorSecret, ...safe } = user;
  return safe;
}
```

**Use Cases**:

- Remove sensitive data (passwords, secrets)
- Enrich with computed properties
- Format dates or other data types
- Add flags based on current user

---

#### postFind(result: readonly T[]): Promise<readonly T[]>

Called after SELECT multiple records.

```typescript
protected async postFind(users: readonly User[]) {
  // Add computed isAdmin flag
  return users.map(user => ({
    ...user,
    isAdmin: user.role === "admin",
    displayName: `${user.firstName} ${user.lastName}`,
  }));
}
```

---

#### postList(result: PaginatedList<T>): Promise<PaginatedList<T>>

Called after paginated SELECT, can modify data array, counts, or entire result.

```typescript
protected async postList(result: PaginatedList<User>) {
  return {
    ...result,
    data: result.data.map(user => ({
      ...user,
      hasActiveSessions: await this.checkActiveSessions(user.id),
    })),
  };
}
```

---

#### postCreate(result: T): Promise<T>

Called after INSERT, can modify created record before returning to caller.

```typescript
protected async postCreate(user: User) {
  // Send welcome email
  await emailService.sendWelcomeEmail(user.email);

  // Log creation
  await auditLog.record("user_created", { userId: user.id });

  return user;
}
```

---

#### postUpdate(result: T): Promise<T>

Called after UPDATE.

```typescript
protected async postUpdate(user: User) {
  // Invalidate cache
  await cache.invalidateUser(user.id);

  return user;
}
```

---

#### postDelete(result: T): Promise<T>

Called after DELETE (soft or hard).

```typescript
protected async postDelete(user: User) {
  // Clean up related resources
  await sessionService.invalidateUserSessions(user.id);
  await fileService.deleteUserFiles(user.id);

  return user;
}
```

---

#### postAll(result: Partial<readonly T[]>): Promise<Partial<readonly T[]>>

Called after SELECT with field projection.

---

#### postCount(result: number): Promise<number>

Called after COUNT operation.

---

### 6.3 Hook Execution Order

**Flow for find(filters) with hooks**:

1. `preFind()` executes
2. SQL query built with filters
3. SQL query executed against database
4. Field names converted (snake_case → camelCase)
5. Results validated against schema if provided
6. `postFind(results)` executes on transformed results
7. Final results returned to caller

**Hook Error Handling**:

- If pre-hook throws: operation aborted, error propagated
- If post-hook throws: database operation already committed, error propagated to caller

---

## 7. FIELD NAME CONVERSION (camelCase ↔ snake_case)

### 7.1 Automatic Output Conversion

**What it does**: Database columns (snake_case) automatically converted to JavaScript properties (camelCase).

**Implementation**: Applied by `fieldNameCaseConverter` interceptor on every query result.

```typescript
// Database table columns: user_id, first_name, created_at, updated_at
const user = await fastify.slonik.pool.one(
  fastify.sql`SELECT user_id, first_name, created_at FROM users WHERE id = ${1}`,
);

// Result automatically has camelCase keys:
console.log(user.userId); // ✓ Works (from user_id)
console.log(user.firstName); // ✓ Works (from first_name)
console.log(user.createdAt); // ✓ Works (from created_at)
console.log(user.user_id); // ✗ Undefined
```

**How it works**: Uses `humps.camelizeKeys()` on every row returned from database.

---

### 7.2 Automatic Input Conversion

**What it does**: JavaScript objects automatically converted to snake_case for database operations.

```typescript
// create() with camelCase input
const newUser = await userService.create({
  firstName: "John",
  lastName: "Doe",
  emailAddress: "john@example.com",
});

// Automatically converted for INSERT:
// INSERT INTO users (first_name, last_name, email_address)
// VALUES ('John', 'Doe', 'john@example.com')
```

**How it works**: Uses `humps.decamelize()` when building INSERT/UPDATE SQL.

---

### 7.3 Filter Field Conversion

**What it does**: Filter keys automatically converted from camelCase to snake_case.

```typescript
const users = await userService.find({
  key: "createdAt", // camelCase in API
  operator: "gt",
  value: "2024-01-01",
});

// Automatically becomes: WHERE created_at > '2024-01-01'
```

---

### 7.4 Sort Field Conversion

**What it does**: Sort column names automatically converted from camelCase to snake_case.

```typescript
const users = await userService.find(undefined, [
  { key: "createdAt", direction: "DESC" }, // camelCase
  { key: "firstName", direction: "ASC" }, // camelCase
]);

// Automatically becomes: ORDER BY created_at DESC, first_name ASC
```

---

## 8. DATABASE MIGRATIONS

### 8.1 Auto-Running Migrations on Startup

**What it does**: Automatically executes pending migrations when application boots.

**Setup**:

```typescript
import slonikPlugin, { migrationPlugin } from "@prefabs.tech/fastify-slonik";

const fastify = Fastify();
await fastify.register(configPlugin, { config });
await fastify.register(slonikPlugin, config.slonik);
await fastify.register(migrationPlugin, config.slonik); // Runs migrations

// Note: migrationPlugin must be registered AFTER slonikPlugin
```

**How it works**:

1. Reads migration directory specified in config
2. Checks which migrations have been run (tracks in \_migrations table)
3. Executes any pending migrations in order
4. Updates \_migrations table on successful execution
5. Throws error if migration fails, preventing app from starting

**Benefits**:

- No external CLI tools needed
- Database always in correct state when app starts
- Automated deployments don't need separate migration step

---

### 8.2 Environment-Specific Migration Paths

**What it does**: Use different migration directories for development and production.

```typescript
const config = {
  slonik: {
    db: {
      /* ... */
    },
    migrations: {
      development: "migrations", // Dev migrations directory
      production: "build/migrations", // Compiled migrations for prod
    },
  },
};
```

**Use Cases**:

- Development: Reference source migrations directly
- Production: Use compiled/built migrations
- Different sets of seed data per environment

---

### 8.3 PostgreSQL Extensions Setup

**What it does**: Automatically creates required PostgreSQL extensions on startup.

**Default extensions** created:

- `citext` - Case-insensitive text type
- `unaccent` - Text search support for accent-insensitive matching

**Configuration**:

```typescript
const config = {
  slonik: {
    db: {
      /* ... */
    },
    extensions: ["citext", "unaccent", "postgis", "uuid-ossp"],
  },
};
```

**Available Extensions**:

- `citext` - For case-insensitive text fields
- `unaccent` - For accent-insensitive searching
- `postgis` - For geographic data (latitude/longitude)
- `uuid-ossp` - For UUID generation
- Custom extensions as needed

**How it works**:

1. Extensions specified in config are merged with defaults
2. Duplicates removed
3. Each extension created with `CREATE EXTENSION IF NOT EXISTS`
4. Runs on every startup (idempotent, safe to run multiple times)

**Benefits**:

- No manual setup needed
- Extensions available for migrations to use
- Enables use of special data types (PostGIS, citext, etc.)

---

## 9. SQL FACTORY & GENERATION

### 9.1 DefaultSqlFactory Overview

**What it does**: Abstract factory class that generates parameterized SQL queries.

**Used by**: BaseService internally (developers don't typically use directly).

**How BaseService uses it**:

```typescript
class UserService extends BaseService<User, CreateUserInput, UpdateUserInput> {
  static readonly TABLE = "users";
  static readonly LIMIT_DEFAULT = 30; // Override default
  static readonly LIMIT_MAX = 100; // Override max

  get sqlFactoryClass() {
    return DefaultSqlFactory; // Can override for custom factory
  }
}
```

---

### 9.2 SQL Generation Methods

#### SQL for Fetching Records

- `getListSql(limit, offset, filters, sort)` - LIMIT/OFFSET pagination
- `getFindSql(filters, sort)` - No pagination
- `getFindOneSql(filters, sort)` - LIMIT 1
- `getFindByIdSql(id)` - Simple SELECT by primary key
- `getAllSql(fields, sort)` - Fetch specific fields only
- `getCountSql(filters)` - COUNT(\*)

---

#### SQL for Modifying Records

- `getCreateSql(data)` - INSERT with RETURNING \*
- `getUpdateSql(id, data)` - UPDATE with RETURNING \*
- `getDeleteSql(id, force)` - DELETE or UPDATE (soft delete)

---

### 9.3 Static Configuration Properties

These can be overridden in subclass:

```typescript
class ProductSqlFactory extends DefaultSqlFactory {
  static readonly TABLE = "products"; // Required
  static readonly LIMIT_DEFAULT = 50; // Default page size
  static readonly LIMIT_MAX = 200; // Max page size
  static readonly SORT_DIRECTION = "DESC"; // ASC or DESC
  static readonly SORT_KEY = "createdAt"; // Default sort column
}
```

---

### 9.4 Schema Support

**What it does**: Query different database schemas (not public schema).

```typescript
// Query from analytics schema instead of public
class ReportService extends BaseService<
  Report,
  CreateReportInput,
  UpdateReportInput
> {
  static readonly TABLE = "reports";

  constructor(config: ApiConfig, database: Database) {
    super(config, database, "analytics"); // Specify schema as 3rd param
  }
}

// Generates: SELECT * FROM analytics.reports
```

---

## 10. DATA TRANSFORMATION & TYPE SAFETY

### 10.1 Type-Safe Query Execution with Zod

**What it does**: Validates query results against Zod schemas at runtime.

```typescript
import { z } from "zod";

const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
});

// Results validated and typed as User
const user = await fastify.slonik.pool.one(
  fastify.sql.type(userSchema)`SELECT * FROM users WHERE id = ${1}`,
);

// TypeScript knows user.id, user.name, user.email, user.age
// Runtime validation ensures data matches schema
```

**How it works**:

1. `sql.type(schema)` sets schema on queryContext
2. Query executes
3. `resultParser` interceptor validates each row
4. Throws `SchemaValidationError` if row doesn't match schema
5. Returns typed result

**Benefits**:

- Type safety at compile time (TypeScript)
- Data validation at runtime (Zod)
- Catches corrupted data before reaching application
- Self-documenting result types

---

### 10.2 Date Formatting

**What it does**: Convert JavaScript dates to PostgreSQL-compatible format.

```typescript
import { formatDate } from "@prefabs.tech/fastify-slonik";

const now = new Date();
const formatted = formatDate(now);
// Returns: "2024-03-15 14:30:45.123"

const user = await userService.create({
  name: "John",
  createdAt: formatted,
});
```

**Format**: `YYYY-MM-DD HH:mm:ss.SSS` (PostgreSQL timestamp format without timezone)

---

### 10.3 BigInt Type Parsing

**What it does**: Handle PostgreSQL `int8` (64-bit integer) values in JavaScript.

```typescript
// Configured automatically in plugin
const stats = await fastify.slonik.pool.one(
  fastify.sql.type(z.object({ views: z.number() }))`
    SELECT views FROM analytics WHERE id = ${1}
  `,
);

console.log(typeof stats.views); // "number"
console.log(stats.views); // Parsed as regular JavaScript number
```

**How it works**:

- Creates custom Slonik type parser for `int8`
- Converts PostgreSQL int64 values to JavaScript Number
- Parser: `Number.parseInt(value, 10)`

**Note**: `@todo` comment in code suggests future support for native BigInt when value > Number.MAX_SAFE_INTEGER.

---

## 11. UTILITIES & HELPERS

### 11.1 Direct Database Connection

**What it does**: Manually create database connection pool (useful for CLI scripts, tests).

```typescript
import { createDatabase } from "@prefabs.tech/fastify-slonik";

const db = await createDatabase("postgresql://user:pass@localhost/myapp", {
  connectionRetryLimit: 5,
  maximumPoolSize: 20,
});

const users = await db.pool.any(db.sql`SELECT * FROM users`);
```

---

### 11.2 Direct SQL Execution

**What it does**: Execute raw parameterized queries outside of BaseService.

**Via request** (inside route handler):

```typescript
fastify.get("/users/:id", async (req, reply) => {
  const user = await req.slonik.pool.one(
    req.sql`SELECT * FROM users WHERE id = ${req.params.id}`,
  );
  return user;
});
```

**Via fastify instance**:

```typescript
const result = await fastify.slonik.query(
  fastify.sql`UPDATE users SET status = ${"active"} WHERE id = ${1}`,
);
```

**Via database object**:

```typescript
const users = await db.pool.any(db.sql`SELECT * FROM users`);
```

---

### 11.3 Connection Routine Execution

**What it does**: Execute code within a single database connection context.

```typescript
const user = await db.connect(async (connection) => {
  const created = await connection.query(
    sql`INSERT INTO users (name) VALUES ${"John"} RETURNING *`,
  );

  const preferences = await connection.query(
    sql`INSERT INTO preferences (user_id) VALUES ${created.id} RETURNING *`,
  );

  return { created, preferences };
});
```

---

### 11.4 Exported Type Definitions

Available for TypeScript:

```typescript
// Core types
export type PaginatedList<T> = {
  totalCount: number;
  filteredCount: number;
  data: readonly T[];
};

export interface Service<T, C, U> {
  create(data: C): Promise<T>;
  find(filters?: FilterInput, sort?: SortInput[]): Promise<readonly T[]>;
  findById(id: string | number): Promise<T | null>;
  findOne(filters?: FilterInput, sort?: SortInput[]): Promise<T | null>;
  list(
    limit?: number,
    offset?: number,
    filters?: FilterInput,
    sort?: SortInput[],
  ): Promise<PaginatedList<T>>;
  update(id: string | number, data: U): Promise<T>;
  delete(id: string | number, force?: boolean): Promise<T | null>;
  all(fields: string[], sort?: SortInput[]): Promise<Partial<readonly T[]>>;
  count(filters?: FilterInput): Promise<number>;
}

export type FilterInput =
  | BaseFilterInput
  | { AND: FilterInput[] }
  | { OR: FilterInput[] };
export type SortInput = {
  key: string;
  direction: "ASC" | "DESC";
  insensitive?: boolean;
};
export type Database = {
  pool: DatabasePool;
  query: QueryFunction;
  connect: ConnectionRoutine;
};
```

---

## 12. SPECIAL BEHAVIORS & OPTIMIZATIONS

### 12.1 SQL Injection Prevention

**What it does**: Prevents SQL injection through parameterized queries.

**Mechanism**:

- All queries use Slonik's tagged template literals
- Values automatically parameterized and bound
- Column/table identifiers safely escaped via `sql.identifier()`
- Even filter values safely bound

```typescript
// Safe: value parameterized
await userService.find({
  key: "email",
  operator: "eq",
  value: "admin'; DROP TABLE users; --", // Safely escaped, not executable
});

// Safe: column name identifier
const column = "name"; // Even if from user input
const sql = `SELECT * FROM users WHERE ${sql.identifier([column])} = $1`;
```

---

### 12.2 Connection Pool & Retry Logic

**What it does**: Automatic retries and connection management for resilience.

**Retry Configuration** (all automatic, no code needed):

- Connection retry limit: 3 attempts
- Query retry limit: 5 attempts
- Transaction retry limit: 5 attempts

**Timeouts**:

- Connection timeout: 5 seconds
- Idle timeout: 5 seconds
- Idle-in-transaction timeout: 60 seconds
- Statement timeout: 60 seconds

**Benefits**:

- Transient failures don't crash app
- Long-running queries don't hang indefinitely
- Idle connections cleaned up automatically

---

### 12.3 Value Type Validation

**What it does**: Ensures only safe types included in SQL queries.

```typescript
const isValueExpression = (value) => {
  // Accepts: null, string, number, boolean, Date, Buffer, arrays of ValueExpressions
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date ||
    value instanceof Buffer ||
    Array.isArray(value)
  );
};

// In create/update: Only includes fields with valid ValueExpression values
// Invalid types (functions, objects, undefined) automatically filtered out
```

---

### 12.4 Query Logging

**What it does**: Optional SQL query logging for debugging and monitoring.

**Enable**:

```typescript
const config = {
  slonik: {
    db: {
      /* ... */
    },
    queryLogging: {
      enabled: true,
    },
  },
};

// Start app with: ROARR_LOG=true npm run dev
```

**Output**:

```
SQL queries logged directly to console via Roarr logger
All parameterized values included
Execution time shown
```

**Limitation**: Roarr logger is independent from Fastify Pino logger; logs to console only (doesn't support file output natively).

---

### 12.5 Result Validation & Schema Enforcement

**What it does**: Optional runtime validation of query results against Zod schemas.

```typescript
const schema = z.object({
  id: z.number(),
  email: z.string().email(),
});

const user = await fastify.slonik.pool.one(
  fastify.sql.type(schema)`SELECT * FROM users WHERE id = ${1}`,
);

// If row doesn't match schema:
// - Throws SchemaValidationError
// - Includes field-by-field validation errors
// - Prevents corrupt/unexpected data from propagating
```

---

### 12.6 Configuration Validation

**What it does**: Validates configuration on plugin registration.

```typescript
// If required fields missing, plugin throws before app starts
await fastify.register(slonikPlugin, {
  db: {
    host: process.env.DB_HOST, // Must be provided
    port: 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    databaseName: process.env.DB_NAME,
  },
});
```

---

### 12.7 Lazy SqlFactory Initialization

**What it does**: SqlFactory instances created only when needed.

**Benefit**: Reduces memory overhead if service methods not called, improves startup time.

---

## FEATURE MATRIX

| Feature                    | Category    | Direct Use               | Indirect Use            | Configurable                |
| -------------------------- | ----------- | ------------------------ | ----------------------- | --------------------------- |
| PostgreSQL Connection Pool | Core        | Via req.slonik           | Automatic               | Yes                         |
| Connection Retries (3x)    | Core        | N/A                      | Automatic               | Yes                         |
| Fastify Decorators         | Core        | Via req.slonik, req.sql  | Every request           | N/A                         |
| CRUD via BaseService       | Core        | Method calls             | Service base            | Via static properties       |
| Soft Delete Support        | Data        | delete(id, force)        | Automatic filtering     | Via \_softDeleteEnabled     |
| 11+ Filter Operators       | Query       | find(filters)            | All find methods        | N/A (built-in)              |
| AND/OR Composition         | Query       | find({ AND: [...] })     | All find methods        | N/A                         |
| Case-Insensitive Search    | Query       | insensitive: true        | Filter processing       | Requires unaccent extension |
| Geographic Filtering       | Query       | operator: "dwithin"      | find() with geo data    | Requires PostGIS            |
| Multi-Column Sorting       | Query       | sort parameter           | find(), list()          | Via SortInput               |
| Offset Pagination          | Pagination  | list(limit, offset)      | Built-in                | Via config                  |
| Limit Enforcement          | Pagination  | N/A                      | Automatic capping       | Via config.pagination       |
| Paginated Counts           | Pagination  | list() return value      | Pagination feature      | N/A                         |
| Pre-Operation Hooks        | Extension   | protected preCreate()    | Service methods         | Override method             |
| Post-Operation Hooks       | Extension   | protected postFindById() | Service methods         | Override method             |
| camelCase ↔ snake_case     | Convenience | Automatic                | All queries/results     | Via interceptor             |
| Auto Migrations            | Startup     | migrationPlugin          | App boot                | Configurable path           |
| Extension Management       | Startup     | N/A                      | Auto-created            | Via config.extensions       |
| Type-Safe Queries (Zod)    | Type Safety | sql.type(schema)         | Query validation        | Via schema parameter        |
| Date Formatting            | Conversion  | formatDate(date)         | Manual use              | Via utility                 |
| BigInt Parsing             | Type Safety | N/A                      | Automatic               | Via type parser             |
| Query Logging              | Debugging   | N/A                      | Via interceptor         | Via queryLogging.enabled    |
| SQL Injection Prevention   | Security    | N/A                      | All queries (automatic) | N/A                         |
| Value Type Validation      | Security    | N/A                      | create/update filter    | N/A                         |

---

## DEVELOPER WORKFLOW EXAMPLE

Here's how these features work together in a typical API endpoint:

```typescript
// 1. Define service with hooks
class ProductService extends BaseService<
  Product,
  CreateProductInput,
  UpdateProductInput
> {
  static readonly TABLE = "products";
  static readonly LIMIT_DEFAULT = 20;
  static readonly LIMIT_MAX = 100;

  protected async preCreate(data: CreateProductInput) {
    // Normalize data
    return {
      ...data,
      name: data.name.trim(),
      slug: data.name.toLowerCase().replace(/\s+/g, "-"),
    };
  }

  protected async postList(result) {
    // Enrich results
    return {
      ...result,
      data: result.data.map((p) => ({
        ...p,
        inStock: p.quantity > 0,
      })),
    };
  }
}

// 2. Use in route handler (camelCase input converted to snake_case automatically)
fastify.get("/products", async (req, reply) => {
  const result = await new ProductService(config, req.slonik).list(
    20, // limit
    0, // offset
    {
      AND: [
        // insensitive: true enables unaccent + lowercase
        { key: "name", operator: "ct", value: "laptop", insensitive: true },
        // Comparison operators work too
        { key: "price", operator: "bt", value: "100,2000" },
        // NOT support
        { key: "status", operator: "eq", value: "discontinued", not: true },
      ],
    },
    [
      { key: "createdAt", direction: "DESC" }, // Converted to created_at
      { key: "name", direction: "ASC" },
    ],
  );

  // Returns:
  // {
  //   totalCount: 5000,
  //   filteredCount: 237,
  //   data: [
  //     { id: 1, name: "Laptop Pro", inStock: true, ... },
  //     ...
  //   ]
  // }

  return result;
});

// 3. Features involved:
// - Filter parsing with 5 operators (ct, bt, eq, not)
// - Case-insensitive search (insensitive: true)
// - AND logic combining filters
// - Multi-column sorting with auto field conversion
// - Soft delete auto-filtering (if enabled)
// - Automatic camelCase → snake_case for all fields
// - postList hook enriching results
// - Limit enforcement (max 100)
// - Count information for pagination UI
```

---

## CONFIGURATION REFERENCE

Complete configuration object structure:

```typescript
interface SlonikOptions {
  // PostgreSQL Connection Details (required)
  db: {
    host: string; // Database host
    port: number; // Database port (default: 5432)
    username: string; // Database user
    password: string; // Database password
    databaseName: string; // Database name
  };

  // Slonik Client Configuration (optional)
  clientConfiguration?: {
    captureStackTrace?: boolean; // default: false
    connectionRetryLimit?: number; // default: 3
    connectionTimeout?: number; // default: 5000 ms
    idleInTransactionSessionTimeout?: number; // default: 60000 ms
    idleTimeout?: number; // default: 5000 ms
    maximumPoolSize?: number; // default: 10
    queryRetryLimit?: number; // default: 5
    statementTimeout?: number; // default: 60000 ms
    transactionRetryLimit?: number; // default: 5
    ssl?: boolean | object; // TLS/SSL config
  };

  // Pagination Settings (optional)
  pagination?: {
    defaultLimit?: number; // default: 20 if not specified
    maxLimit?: number; // default: 50 (hard cap)
  };

  // Migration Paths (optional)
  migrations?: {
    development?: string; // default: "migrations"
    production?: string; // default: "build/migrations"
  };

  // PostgreSQL Extensions to create (optional)
  extensions?: string[]; // default: ["citext", "unaccent"]
  // can add: "postgis", "uuid-ossp", etc

  // Query Logging (optional)
  queryLogging?: {
    enabled?: boolean; // default: false
    // Requires ROARR_LOG=true env var to see output
  };
}
```

---

## FEATURE CHECKLIST FOR DEVELOPERS

When building API endpoints with this plugin, you have these tools at your disposal:

### Query Operations

- [x] SELECT single by ID (`findById()`)
- [x] SELECT single by filters (`findOne()`)
- [x] SELECT multiple (`find()`)
- [x] SELECT with pagination (`list()`)
- [x] SELECT specific fields only (`all()`)
- [x] COUNT records (`count()`)

### Filtering

- [x] Exact match (`eq`)
- [x] Case-insensitive exact (`insensitive: true`)
- [x] String contains (`ct`)
- [x] String starts with (`sw`)
- [x] String ends with (`ew`)
- [x] Numeric range (`bt`)
- [x] Comparison operators (`gt`, `gte`, `lt`, `lte`)
- [x] IN list (`in`)
- [x] Geographic distance (`dwithin`)
- [x] NOT/negation (`not: true`)
- [x] AND/OR composition (AND/OR arrays)
- [x] Nested complex filters (arbitrary depth)

### Sorting

- [x] Single column sort
- [x] Multi-column sort
- [x] Ascending/descending
- [x] Case-insensitive sort (`insensitive: true`)
- [x] Default sort behavior
- [x] Automatic camelCase conversion

### Data Operations

- [x] Create records (`create()`)
- [x] Update records (`update()`)
- [x] Soft delete (`delete()` with soft delete enabled)
- [x] Hard delete (`delete(id, true)`)

### Type Safety

- [x] Zod schema validation on queries
- [x] TypeScript generics on BaseService
- [x] Type inference on results
- [x] Runtime validation

### Auto Features

- [x] camelCase ↔ snake_case conversion
- [x] SQL injection prevention
- [x] Connection pooling & retries
- [x] Migration execution
- [x] Extension creation (citext, unaccent, postgis, etc)
- [x] Soft delete filtering (if enabled)

### Extensibility

- [x] Pre-hooks (preCreate, preUpdate, preDelete, etc)
- [x] Post-hooks (postCreate, postUpdate, postDelete, etc)
- [x] Custom SQL factories
- [x] Schema-specific queries
- [x] Custom result enrichment

---

## PERFORMANCE CONSIDERATIONS

This plugin is designed for performance:

1. **Query Efficiency**: Raw SQL via Slonik (not ORM overhead)
2. **Connection Pooling**: Max 10 connections by default, configurable
3. **Retry Logic**: Automatic retries for transient failures
4. **Lazy Initialization**: SqlFactory created only when used
5. **Limit Enforcement**: Prevents accidental massive queries
6. **Caching**: Relies on PostgreSQL query cache, not app-level caching
7. **No N+1 Problems**: Encourages explicit queries vs automatic relations

**Best Practices**:

- Use `find()` for specific queries, not `list()` when pagination not needed
- Use `all(fields)` to project specific columns, reducing data transfer
- Use filters with indexes to avoid full table scans
- Enable query logging during development to review generated SQL
- Use schema-specific queries if splitting by tenant

---

## WHAT'S AUTOMATICALLY HANDLED

The plugin handles these concerns transparently:

- ✓ Establishing database connection
- ✓ Retrying failed connections
- ✓ Managing connection pool lifecycle
- ✓ Converting camelCase field names to/from snake_case
- ✓ Executing migrations at startup
- ✓ Creating PostgreSQL extensions
- ✓ Injecting database access into all requests
- ✓ Validating query results against schemas
- ✓ Preventing SQL injection
- ✓ Filtering soft-deleted records
- ✓ Type-checking query results
- ✓ Parsing PostgreSQL int8 to JavaScript numbers

---

## WHAT DEVELOPERS CONTROL

These aspects are customizable:

- Connection pool size and timeouts
- Default and maximum pagination limits
- Migration paths per environment
- PostgreSQL extensions to create
- Field filtering and sorting logic
- Pre/post operation hook logic
- Result transformation and enrichment
- Custom SQL generation (via factory override)
- Database schema used (via 3rd param to BaseService)
- Query logging enable/disable

---
