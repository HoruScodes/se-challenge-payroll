const express = require("express");
const app = express();
const sqlite3 = require("sqlite3").verbose();
const csv = require("csvtojson");
const multer = require("multer");
const bodyParser = require("body-parser");

const upload = multer({
  storage: multer.memoryStorage(),
  inMemory: true,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

let fileUploadHistory = [];

let createQuery = `CREATE TABLE IF NOT EXISTS payroll(
    id integer PRIMARY KEY,
    date text NOT NULL,
    hours text NOT NULL,
    employee_id text NOT NULL,
    group_name text NOT NULL
)`;

let insertQuery = `INSERT INTO payroll (date, hours, employee_id, group_name) VALUES (?, ?, ? , ?)`;

let selectQuery = `SELECT * FROM payroll ORDER BY id DESC`;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function createOrConnectPayrollDatabase() {
  return new sqlite3.Database("payroll.db", (error) => {
    if (error) {
      return console.error(error.message);
    }
  });
}

function createTableIfNotExist(db) {
  db.run(createQuery, [], (error) => {
    if (error) {
      return console.error(error.message);
    }
  });
}

function selectAndSendPayrollData(db, res) {
  db.all(selectQuery, [], async (error, dataRows) => {
    if (error) {
      return console.log(error.message);
    }
    const data = await sendPayrollData(dataRows);
    res.send(data);
  });
}

function closeDatabaseConnection(db) {
  db.close((error) => {
    if (error) {
      return console.error(error.message);
    }
  });
}

app.get("/", (req, res) => {
  // Connect to or create database
  let db = createOrConnectPayrollDatabase();
  db.serialize(() => {
    // Create table it if does not exist yet
    createTableIfNotExist(db);
    selectAndSendPayrollData(db, res);
  });
});

app.post("/add", upload.single("upload-single"), (req, res) => {
  if (req.file) {
    if (fileUploadHistory.indexOf(req.file.originalname) > -1) {
      res.status(404).send("Already Uploaded");
    } else {
      fileUploadHistory.push(req.file.originalname);
      let csvString = req.file.buffer.toString();
      csv({ noheader: false, output: "csv" })
        .fromString(csvString)
        .then((csvRow) => {
          processData(csvRow, res);
        });
    }
  }
});

let processData = (csvData, res) => {
  // Connect to or create database
  let db = createOrConnectPayrollDatabase();

  db.serialize(() => {
    createTableIfNotExist(db);

    csvData.forEach((row) => {
      db.run(insertQuery, row, (error) => {
        if (error) {
          return console.log(error.message);
        }
      });
    });

    db.all(selectQuery, [], (error) => {
      if (error) {
        return console.log(error.message);
      }
      res.status(200).send("Created Successfully");
    });
  });

  closeDatabaseConnection(db);
};

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

const sendPayrollData = async (data) => {
  const employeeData = [];

  data.forEach((row, index) => {
    const { payPeriod } = getPayPeriod(row.date);
    let indexOfMatch = -1;

    const employee = employeeData.find((employee) => {
      return (
        employee?.employeeId === row.employee_id &&
        employee.payPeriod.startDate === payPeriod.startDate
      );
    });

    //get the index of the match
    indexOfMatch = employeeData.indexOf(employee);

    const rate = row.group_name === "A" ? 20 : 30;

    if (indexOfMatch !== -1) {
      employeeData[indexOfMatch].hours += parseInt(row.hours);
      employeeData[indexOfMatch].amountPaid =
        employeeData[indexOfMatch].hours * rate;
    } else {
      employeeData[index] = {
        employeeId: row.employee_id,
        payPeriod: payPeriod,
        hours: parseInt(row.hours),
        amountPaid: parseInt(row.hours) * rate,
      };
    }
  });
  const finalData = await makeFinalData(employeeData);
  return finalData;
};

function makeFinalData(employeeData) {
  return new Promise((resolve, reject) => {
    let finalData = [];
    employeeData.forEach((employee) => {
      finalData.push({
        employeeId: employee.employeeId,
        payPeriod: employee.payPeriod,
        amountPaid: `$${employee.amountPaid}.00`,
      });
    });

    finalData.sort(function (a, b) {
      return a.employeeId - b.employeeId;
    });

    resolve({
      payrollReport: {
        employeeReports: finalData,
      },
    });
  });
}

function getPayPeriod(date) {
  const day = date.split("/")[0];
  const month = date.split("/")[1];
  const year = date.split("/")[2];
  if (day <= 15) {
    return {
      payPeriod: {
        startDate: `${year}-${month}-1`,
        endDate: `${year}-${month}-15`,
      },
    };
  }
  return {
    payPeriod: {
      startDate: `${year}-${month}-16`,
      endDate: `${year}-${month}-30`,
    },
  };
}
