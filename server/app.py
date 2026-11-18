"""SQLite-backed salary management API. Run with python3 server/app.py."""
import json
import os
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
DB = os.environ.get('SALARY_DB', str(ROOT / 'salary.db'))


def connect():
    db = sqlite3.connect(DB, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys = ON')
    return db


def init_db():
    with connect() as db:
        db.executescript('''
        CREATE TABLE IF NOT EXISTS employees (
          id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL, department TEXT NOT NULL, country TEXT NOT NULL,
          currency TEXT NOT NULL, salary INTEGER NOT NULL CHECK(salary >= 0),
          version INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS salary_changes (
          id INTEGER PRIMARY KEY, employee_id INTEGER NOT NULL REFERENCES employees(id),
          old_salary INTEGER NOT NULL, new_salary INTEGER NOT NULL,
          changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE INDEX IF NOT EXISTS employee_country ON employees(country);
        CREATE INDEX IF NOT EXISTS employee_department ON employees(department);
        ''')


def rows(cursor):
    return [dict(r) for r in cursor.fetchall()]


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        q = parse_qs(parsed.query)
        try:
            with connect() as db:
                if parsed.path == '/api/employees':
                    where, args = [], []
                    search = q.get('search', [''])[0].strip()
                    if search:
                        where.append('(name LIKE ? ESCAPE "\\" OR email LIKE ? ESCAPE "\\" OR CAST(id AS TEXT) LIKE ? ESCAPE "\\")')
                        term = '%' + search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
                        args.extend([term] * 3)
                    for field in ('country', 'department'):
                        value = q.get(field, [''])[0]
                        if value:
                            where.append(field + ' = ?')
                            args.append(value)
                    clause = ' WHERE ' + ' AND '.join(where) if where else ''
                    sort = q.get('sort', ['name'])[0]
                    if sort not in ('id', 'name', 'department', 'country', 'salary'):
                        sort = 'name'
                    direction = 'DESC' if q.get('order', ['asc'])[0] == 'desc' else 'ASC'
                    try:
                        page = max(1, int(q.get('page', ['1'])[0]))
                        limit = min(100, max(1, int(q.get('limit', ['20'])[0])))
                    except ValueError:
                        return self.send_json(400, {'error': 'Invalid pagination.'})
                    total = db.execute('SELECT count(*) FROM employees' + clause, args).fetchone()[0]
                    data = rows(db.execute('SELECT * FROM employees' + clause + ' ORDER BY ' + sort + ' ' + direction + ', id ASC LIMIT ? OFFSET ?', args + [limit, (page - 1) * limit]))
                    return self.send_json(200, {'employees': data, 'total': total, 'page': page, 'limit': limit})
                if parsed.path == '/api/summary':
                    count = db.execute('SELECT count(*) FROM employees').fetchone()[0]
                    countries = db.execute('SELECT count(DISTINCT country) FROM employees').fetchone()[0]
                    departments = db.execute('SELECT count(DISTINCT department) FROM employees').fetchone()[0]
                    groups = rows(db.execute('SELECT country, currency, count(*) AS count, round(avg(salary), 2) AS average, sum(salary) AS total FROM employees GROUP BY country, currency ORDER BY count DESC, country'))
                    dept = rows(db.execute('SELECT department, count(*) AS count FROM employees GROUP BY department ORDER BY count DESC, department'))
                    filters = {'countries': [r[0] for r in db.execute('SELECT DISTINCT country FROM employees ORDER BY country')], 'departments': [r[0] for r in db.execute('SELECT DISTINCT department FROM employees ORDER BY department')]}
                    return self.send_json(200, {'count': count, 'countries': countries, 'departments': departments, 'by_country': groups, 'by_department': dept, 'filters': filters})
                if parsed.path.startswith('/api/employees/') and parsed.path.endswith('/history'):
                    parts = parsed.path.split('/')
                    if len(parts) == 5 and parts[3].isdigit():
                        employee = db.execute('SELECT id FROM employees WHERE id = ?', (int(parts[3]),)).fetchone()
                        if not employee:
                            return self.send_json(404, {'error': 'Employee not found.'})
                        return self.send_json(200, {'history': rows(db.execute('SELECT old_salary, new_salary, changed_at FROM salary_changes WHERE employee_id = ? ORDER BY id DESC LIMIT 20', (int(parts[3]),)))})
                if parsed.path.startswith('/api/'):
                    return self.send_json(404, {'error': 'Not found.'})
            self.serve_static(parsed.path)
        except sqlite3.Error:
            self.send_json(500, {'error': 'Database error.'})

    def do_PATCH(self):
        parts = urlparse(self.path).path.split('/')
        if len(parts) != 4 or parts[1:3] != ['api', 'employees'] or not parts[3].isdigit():
            return self.send_json(404, {'error': 'Not found.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length <= 0 or length > 4096:
                raise ValueError()
            data = json.loads(self.rfile.read(length))
            salary, version = data['salary'], data['version']
            if type(salary) is not int or not 0 <= salary <= 1000000000 or type(version) is not int:
                raise ValueError()
        except (ValueError, KeyError, TypeError, json.JSONDecodeError):
            return self.send_json(400, {'error': 'Provide a whole-number salary between 0 and 1,000,000,000 and a version.'})
        try:
            with connect() as db:
                db.execute('BEGIN IMMEDIATE')
                employee = db.execute('SELECT * FROM employees WHERE id = ?', (int(parts[3]),)).fetchone()
                if not employee:
                    return self.send_json(404, {'error': 'Employee not found.'})
                if employee['version'] != version:
                    return self.send_json(409, {'error': 'This employee was updated elsewhere. Refresh and try again.'})
                if employee['salary'] != salary:
                    db.execute('UPDATE employees SET salary = ?, version = version + 1 WHERE id = ?', (salary, employee['id']))
                    db.execute('INSERT INTO salary_changes (employee_id, old_salary, new_salary) VALUES (?, ?, ?)', (employee['id'], employee['salary'], salary))
                updated = dict(db.execute('SELECT * FROM employees WHERE id = ?', (employee['id'],)).fetchone())
            return self.send_json(200, updated)
        except sqlite3.Error:
            return self.send_json(500, {'error': 'Database error.'})

    def serve_static(self, path):
        import mimetypes
        base = (ROOT / 'frontend' / 'dist').resolve()
        target = (base / path.lstrip('/')).resolve()
        if not target.is_relative_to(base) or not target.is_file():
            target = base / 'index.html'
        if not target.is_file():
            return self.send_json(404, {'error': 'Frontend not built. Run npm run build in frontend.'})
        content = target.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(str(target))[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)


if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', '8000'))
    print('Listening on http://localhost:%s' % port, flush=True)
    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
