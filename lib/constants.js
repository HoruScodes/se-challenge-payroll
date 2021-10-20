const CREATE_TABLE_QUERY = `CREATE TABLE IF NOT EXISTS payroll(
    id integer PRIMARY KEY,
    date text NOT NULL,
    hours text NOT NULL,
    employee_id text NOT NULL,
    group_name text NOT NULL
)`;

const INSERT_TABLE_QUERY = `INSERT INTO payroll (date, hours, employee_id, group_name) VALUES (?, ?, ? , ?)`;

const SELECT_TABLE_QUERY = `SELECT * FROM payroll ORDER BY id DESC`;

module.exports = {
  CREATE_TABLE_QUERY,
  INSERT_TABLE_QUERY,
  SELECT_TABLE_QUERY,
};
