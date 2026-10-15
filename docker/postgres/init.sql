-- Runs once, when the postgres volume is first created.
-- btree_gist lets exclusion constraints combine "=" on provider_id with "&&" on time ranges.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Separate database for integration tests so test resets never touch dev data.
CREATE DATABASE clinic_test OWNER clinic;
\c clinic_test
CREATE EXTENSION IF NOT EXISTS btree_gist;
