# Supabase Local to Live Workflow

This document outlines the standard workflow for developing your Supabase backend locally and deploying changes to a live environment (like staging or production). It also includes troubleshooting steps for common issues.

## 1. The Standard Workflow

The ideal workflow is to make all schema changes locally first, capture them in version-controlled migration files, and then apply those migrations to your live project.

### Step 1: Develop Locally
- Run `supabase start` to work on your local Docker-based environment.
- Create and modify tables, columns, and policies using Supabase Studio (`http://localhost:54323`) or a direct database connection.

### Step 2: Link Your Project
- Create a new project on the [Supabase Dashboard](https://supabase.com/dashboard).
- In your project's dashboard, go to **Settings > General** and copy the **Project Ref**.
- In your terminal, link your local project to the live one:
  ```bash
  supabase link --project-ref <your-project-ref>
  ```

### Step 3: Generate a Migration
- After making schema changes locally, generate a migration file to capture them. This detects the changes and writes the corresponding SQL to a new file.
  ```bash
  supabase migration new "a_descriptive_name_for_your_change"
  ```
- This creates a new file in `supabase/migrations/`. You should commit this file to Git.

### Step 4: Deploy the Migration
- Apply the migration to your linked live project:
  ```bash
  supabase migration up
  ```
- The CLI will run any migration files that have not yet been run on your live database.

---

## 2. Troubleshooting Common Issues

Sometimes the process doesn't go smoothly. Here are solutions to the problems we encountered.

### Issue 1: `db push` says "Remote database is up to date" on first push.

- **Problem:** You've built your schema locally and want to push it to a new, empty live project, but `supabase db push` does nothing.
- **Solution:** For the very first push, it's often better to generate a migration file that contains your entire schema.
  ```bash
  # This command compares your local DB to the remote and writes the difference to a file.
  supabase db diff --file supabase/migrations/0000_initial_schema.sql
  
  # Then, push the migration.
  supabase migration up
  ```

### Issue 2: PostgreSQL Version Mismatch

- **Problem:** You see an error like `pg_dump: error: aborting because of server version mismatch`. This happens when your live project uses a newer version of PostgreSQL than your local Supabase CLI supports.
- **Solution:**
  1. **Update your Supabase CLI**. If you installed with Homebrew:
     ```bash
     brew upgrade supabase
     ```
  2. **Update your local project's config**. Change the version in `supabase/config.toml` to match your live project (e.g., from `15` to `17`).
     ```toml
     [db]
     major_version = 17
     ```
  3. **Restart Supabase**:
     ```bash
     supabase stop
     supabase start
     ```

### Issue 3: Inconsistent Migration History

- **Problem:** `supabase migration up` fails with an error like `Remote migration versions not found in local migrations directory`. This means the history on your live project is out of sync with your local files, often after failed attempts.
- **Solution: The Final Reset**
  1. **Unlink the project** to sever the connection:
     ```bash
     supabase unlink
     ```
  2. **Clean the remote history**. Go to the SQL Editor in your Supabase Dashboard and run:
     ```sql
     TRUNCATE supabase_migrations.schema_migrations;
     ```
  3. **Clean your local migrations folder**: Delete all `.sql` files inside `supabase/migrations`.
  4. **Generate a fresh, single schema file**:
     ```bash
     supabase db diff --file supabase/migrations/0000_initial_schema.sql
     ```
  5. **Relink the project**:
     ```bash
     supabase link --project-ref <your-project-ref>
     ```
  6. **Push the schema directly**. This command works well after a fresh link.
     ```bash
     supabase db push
     ```

---

## 3. Managing Dev vs. Production Environments

To manage multiple environments (e.g., a "dev" server and a "production" server), you would:
1. Create two separate projects in the Supabase Dashboard.
2. Link to your "dev" project first to test migrations.
3. Once verified, unlink and relink to your "production" project and run the same `supabase migration up` command.
