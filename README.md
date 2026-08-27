# Database Connection String Generator

Browser-only tool that builds ODBC, OLE DB, and ADO.NET connection strings for common databases.  

**Live site:** [filcuk.github.io/connection-string-creator](https://filcuk.github.io/connection-string-creator/)

![App screenshot](/res/screenshot-1.jpg)

## Supported engines

| Database | ODBC | OLE DB | ADO.NET |
| -------- | ---- | ------ | ------- |
| Microsoft SQL Server | ✓ | ✓ | ✓ |
| Azure SQL Database | ✓ | ✓ | ✓ |
| Oracle | ✓ | ✓ | ✓ |
| IBM DB2 | ✓ | ✓ | ✓ |
| IBM AS/400 (IBM i) | ✓ | ✓ | ✓ |
| MySQL | ✓ | | ✓ |
| MariaDB | ✓ | | ✓ |
| PostgreSQL | ✓ | | ✓ |
| SQLite | ✓ | | ✓ |
| Amazon Redshift | ✓ | | ✓ |
| Firebird | ✓ | | ✓ |
| Teradata | ✓ | ✓ | ✓ |

Formats and keywords follow vendor docs and [ConnectionStrings.com](https://www.connectionstrings.com/) as a reference.

## Local development

```bash
npx serve .
```

Open the printed URL (ES modules need HTTP, not `file://`).

```bash
npm test                 # golden-string tests for builders
npm run test:goldens     # regenerate snapshots after intentional keyword changes
```

## Credit

Connection string patterns draw on public documentation and [ConnectionStrings.com](https://www.connectionstrings.com/) contributors. This app is a convenience UI, not an official product of those vendors.
