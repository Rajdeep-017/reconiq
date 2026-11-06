import psycopg2
conn = psycopg2.connect('postgresql://reconiq:reconiq_dev@localhost:5432/reconiq')
conn.autocommit = True
cur = conn.cursor()

# Check organizations table
cur.execute("SELECT to_regclass('organizations')")
print('organizations table:', cur.fetchone()[0])

# Check users.org_id
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='org_id'")
print('users.org_id:', cur.fetchone())

# Check organizations.owner_id FK
cur.execute("SELECT conname FROM pg_constraint WHERE conname='fk_organizations_owner_id'")
print('organizations.owner_id FK:', cur.fetchone())

# Check users.org_id FK
cur.execute("SELECT conname FROM pg_constraint WHERE conname='fk_users_org_id'")
print('users.org_id FK:', cur.fetchone())

cur.close()
conn.close()