-- Synthetic data only. This script intentionally refuses to overwrite existing data.
-- For a fresh demo, create an empty database and apply schema.sql first.
BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM employees) OR EXISTS (SELECT 1 FROM countries)
       OR EXISTS (SELECT 1 FROM departments) OR EXISTS (SELECT 1 FROM salary_changes) THEN
        RAISE EXCEPTION 'Seed requires an empty salary database; existing data was not changed';
    END IF;
END $$;

INSERT INTO countries (code, name, currency) VALUES
    ('US', 'United States', 'USD'), ('IN', 'India', 'INR'),
    ('GB', 'United Kingdom', 'GBP'), ('DE', 'Germany', 'EUR'),
    ('CA', 'Canada', 'CAD'), ('AU', 'Australia', 'AUD');

INSERT INTO departments (name) VALUES
    ('Engineering'), ('Sales'), ('Operations'), ('Finance'),
    ('People'), ('Marketing'), ('Product'), ('Customer Success');

-- md5 is used as a deterministic pseudo-random source, not for security.
WITH source AS (
    SELECT n, (('x' || substr(md5('salary-demo-' || n), 1, 8))::bit(32)::bigint) AS h
    FROM generate_series(1, 10000) AS n
), choices AS (
    SELECT n, h,
        (ARRAY['Aarav','Aditi','Alex','Amara','Amelia','Ana','Arjun','Ben','Chloe','Daniel','Elena','Emily','Fatima','Hannah','Ibrahim','Isabella','Jack','James','Jia','Kai','Liam','Maya','Mia','Noah','Oliver','Priya','Sofia','Zara'])[1 + (h % 28)::int] AS first_name,
        (ARRAY['Anderson','Brown','Chen','Das','Garcia','Gupta','Jones','Khan','Kim','Kumar','Lee','Martin','Mehta','Miller','Patel','Robinson','Shah','Singh','Smith','Taylor','Thomas','Walker','Wang','Wilson'])[1 + ((h / 29) % 24)::int] AS last_name,
        (ARRAY['US','IN','GB','DE','CA','AU'])[1 + ((h / 701) % 6)::int] AS country_code,
        (ARRAY['Engineering','Sales','Operations','Finance','People','Marketing','Product','Customer Success'])[1 + ((h / 4207) % 8)::int] AS department_name
    FROM source
), prepared AS (
    SELECT *, CASE country_code
        WHEN 'US' THEN 85000 + (h % 106) * 1000
        WHEN 'IN' THEN 800000 + (h % 2401) * 1000
        WHEN 'GB' THEN 45000 + (h % 66) * 1000
        WHEN 'DE' THEN 55000 + (h % 66) * 1000
        WHEN 'CA' THEN 65000 + (h % 86) * 1000
        WHEN 'AU' THEN 75000 + (h % 86) * 1000
    END AS salary_major
    FROM choices
)
INSERT INTO employees (id, first_name, last_name, email, job_title, department_id, country_code, annual_salary_minor)
SELECT p.n, p.first_name, p.last_name,
    lower(p.first_name || '.' || p.last_name || p.n || '@example.com'),
    CASE p.department_name
        WHEN 'Engineering' THEN 'Software Engineer'
        WHEN 'Sales' THEN 'Account Executive'
        WHEN 'Operations' THEN 'Operations Analyst'
        WHEN 'Finance' THEN 'Financial Analyst'
        WHEN 'People' THEN 'People Partner'
        WHEN 'Marketing' THEN 'Marketing Specialist'
        WHEN 'Product' THEN 'Product Manager'
        WHEN 'Customer Success' THEN 'Customer Success Manager'
    END,
    d.id, p.country_code, p.salary_major * 100
FROM prepared p JOIN departments d ON d.name = p.department_name;

-- Explicit synthetic IDs must not collide with later generated IDs.
SELECT setval(pg_get_serial_sequence('employees', 'id'), 10000, true);
COMMIT;
