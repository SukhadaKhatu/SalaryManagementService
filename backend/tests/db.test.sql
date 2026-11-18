-- Run against a freshly seeded database. All mutation checks are rolled back.
BEGIN;
DO $$
DECLARE
    generated_id INTEGER;
BEGIN
    IF (SELECT count(*) FROM employees) <> 10000 THEN
        RAISE EXCEPTION 'Expected 10,000 employees';
    END IF;
    IF (SELECT count(DISTINCT email) FROM employees) <> 10000 THEN
        RAISE EXCEPTION 'Expected unique employee emails';
    END IF;
    IF (SELECT count(*) FROM countries) <> 6 OR (SELECT count(*) FROM departments) <> 8 THEN
        RAISE EXCEPTION 'Unexpected reference data';
    END IF;
    IF EXISTS (SELECT 1 FROM countries c WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.country_code = c.code))
       OR EXISTS (SELECT 1 FROM departments d WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.id)) THEN
        RAISE EXCEPTION 'Every country and department should have employees';
    END IF;
    INSERT INTO employees (first_name, last_name, email, job_title, department_id, country_code, annual_salary_minor)
    SELECT 'Test', 'Person', 'test.person@example.com', 'Tester', id, 'US', 10000 FROM departments LIMIT 1
    RETURNING id INTO generated_id;
    IF generated_id <= 10000 THEN RAISE EXCEPTION 'Employee identity not advanced'; END IF;
    BEGIN
        UPDATE employees SET annual_salary_minor = -1 WHERE id = generated_id;
        RAISE EXCEPTION 'Negative salaries must be rejected';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE employees SET country_code = 'ZZ' WHERE id = generated_id;
        RAISE EXCEPTION 'Unknown countries must be rejected';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
END $$;
ROLLBACK;
SELECT 'Database checks passed' AS result;
