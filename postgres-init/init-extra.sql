-- Extra initialization: create auxiliary 'admin' database to silence tooling
-- Only runs on first container start (when PGDATA is empty)
CREATE DATABASE admin;