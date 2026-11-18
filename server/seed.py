"""Replace the demo database with deterministic synthetic employees."""
import random
from app import connect, init_db

FIRST = ['Aarav','Aditi','Alex','Amara','Amelia','Ana','Arjun','Ben','Chloe','Daniel','Elena','Emily','Fatima','Hannah','Ibrahim','Isabella','Jack','James','Jia','Kai','Liam','Maya','Mia','Noah','Oliver','Priya','Sofia','Zara']
LAST = ['Anderson','Brown','Chen','Das','Garcia','Gupta','Jones','Khan','Kim','Kumar','Lee','Martin','Mehta','Miller','Patel','Robinson','Shah','Singh','Smith','Taylor','Thomas','Walker','Wang','Wilson']
COUNTRIES = [('United States','USD',85000,190000),('India','INR',800000,3200000),('United Kingdom','GBP',45000,110000),('Germany','EUR',55000,120000),('Canada','CAD',65000,150000),('Australia','AUD',75000,160000)]
DEPTS = {'Engineering':['Software Engineer','Engineering Manager','Data Engineer'], 'Sales':['Account Executive','Sales Manager','Sales Associate'], 'Operations':['Operations Manager','Operations Analyst'], 'Finance':['Financial Analyst','Accountant'], 'People':['HR Specialist','People Partner'], 'Marketing':['Marketing Manager','Brand Specialist'], 'Product':['Product Manager','Product Designer'], 'Customer Success':['Customer Success Manager','Support Specialist']}

def seed():
    init_db()
    rng = random.Random(42)
    employees = []
    for i in range(1, 10001):
        first, last = rng.choice(FIRST), rng.choice(LAST)
        country, currency, low, high = rng.choice(COUNTRIES)
        department = rng.choice(list(DEPTS))
        employees.append((i, first + ' ' + last, (first + '.' + last + str(i) + '@example.com').lower(), rng.choice(DEPTS[department]), department, country, currency, rng.randrange(low // 1000, high // 1000 + 1) * 1000))
    with connect() as db:
        db.execute('DELETE FROM salary_changes')
        db.execute('DELETE FROM employees')
        db.executemany('INSERT INTO employees(id,name,email,title,department,country,currency,salary) VALUES (?,?,?,?,?,?,?,?)', employees)
    print('Seeded 10,000 synthetic employees.')

if __name__ == '__main__':
    seed()
