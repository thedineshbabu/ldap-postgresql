---

## Title:

**LDAP to PostgreSQL User Migration Script Using NestJS**

## Owner:

Dineshbabu Manoharan

## Stakeholders:

* Platform Engineering Team
* Identity & Access Management (IAM) Team
* Application Development Team

## Overview:

The current user base is maintained in **Red Hat IDM** (LDAP). Each client has a dedicated Organizational Unit (OU), and user details are stored under each client's OU. The goal is to **migrate the user data from LDAP into a PostgreSQL database**, where each client and its users are stored in relational tables. The migration will be implemented using a **NestJS-based CLI script**.

---

## 🧩 Problem Statement:

* Centralized authentication data is stored in LDAP in a deeply nested hierarchy.
* Modern applications and internal services require direct access to a SQL-based user store (PostgreSQL).
* LDAP password hashes may not be usable as-is with application frameworks.
* A reliable, scriptable migration pipeline is required to import and transform the user base.

---

## 🎯 Goals:

1. Extract all client and user entries from Red Hat IDM (LDAP).
2. Normalize and insert this data into relational PostgreSQL tables.
3. Re-hash user passwords to a modern format (e.g., bcrypt).
4. Maintain referential integrity (client → users).
5. Store LDAP DN and original data for traceability.
6. Provide a reusable NestJS script with configuration abstraction.

---

## 🚫 Out of Scope:

* Two-way sync (PostgreSQL → LDAP).
* Real-time or incremental sync.
* UI/UX for the migration process.
* Password reset or user verification flows post-migration.

---

## 📂 Source LDAP Structure:

```
dc=example,dc=com
└── ou=clients
    ├── ou=clientA
    │   ├── uid=user1
    │   └── uid=user2
    └── ou=clientB
        └── uid=user3
```

Each `uid=userX` contains:

* `uid`
* `givenName`
* `sn`
* `mail`
* `userPassword` (hashed, e.g., `{SSHA}`)

---

## 📊 Target PostgreSQL Schema:

### Table: `clients`

| Column     | Type         | Notes                 |
| ---------- | ------------ | --------------------- |
| id         | SERIAL       | Primary Key           |
| client\_id | VARCHAR(255) | Unique client OU name |
| name       | VARCHAR(255) | Optional client name  |

### Table: `users`

| Column         | Type         | Notes                      |
| -------------- | ------------ | -------------------------- |
| id             | SERIAL       | Primary Key                |
| client\_id     | INTEGER      | FK → clients(id)           |
| username       | VARCHAR(255) | LDAP `uid`                 |
| first\_name    | VARCHAR(255) | `givenName`                |
| last\_name     | VARCHAR(255) | `sn`                       |
| email          | VARCHAR(255) | `mail`                     |
| password\_hash | TEXT         | Re-hashed with bcrypt      |
| ldap\_dn       | TEXT         | Full LDAP DN of user entry |

---

## 🛠 Technical Approach:

### 1. **NestJS Script**

* Standalone CLI tool using NestJS modules.
* LDAP connection via `ldapts`.
* PostgreSQL access via `pg`.
* Password hashing with `bcrypt`.

### 2. **Migration Flow**

* Bind to LDAP with manager credentials.
* Search `ou=clients` for all client OUs.
* For each client OU:

  * Insert or update client in DB.
  * Fetch all users (objectClass=inetOrgPerson).
  * Rehash password if available.
  * Insert user data into DB.

### 3. **Error Handling**

* Log and skip users with missing required fields.
* Catch and log DB/LDAP exceptions without crashing.

---

## ⚙ Configuration:

Values read from config service/environment:

```ts
LDAP_URL=ldap://idm.example.com:389
LDAP_BIND_DN=cn=Directory Manager
LDAP_BIND_PASSWORD=******
LDAP_BASE_DN=ou=clients,dc=example,dc=com

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=usersdb
```

---

## 🧪 Testing Strategy:

* Validate sample data migration from a test LDAP environment.
* Cross-check counts of clients and users before/after.
* Manual login test with rehashed password in dev app.
* Unit test service layers (e.g., user insert, password hash).

---

## 🕒 Timeline:

| Phase | Task                              | Duration |
| ----- | --------------------------------- | -------- |
| 1     | Schema design & planning          | 1 day    |
| 2     | Build NestJS LDAP and DB services | 2 days   |
| 3     | Implement migration logic         | 2 days   |
| 4     | Testing & data validation         | 1–2 days |
| 5     | Production dry-run                | 1 day    |

**Estimated Total**: \~1 Week

---

## ✅ Acceptance Criteria:

* [ ] All clients and users are migrated with correct hierarchy.
* [ ] Passwords are stored in bcrypt (or fallback properly logged).
* [ ] Script can run idempotently (no duplicates).
* [ ] Configurable via `.env` or config service.
* [ ] Easy to run as a one-time CLI tool.

---

## 📎 Appendix:

* LDAP ObjectClasses used: `organizationalUnit`, `inetOrgPerson`
* LDAP Sample DN: `uid=john,ou=client123,ou=clients,dc=example,dc=com`
* PostgreSQL Tables: `clients`, `users`

---
