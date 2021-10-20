const sqlite3 = require("sqlite3").verbose();

const constants = require("./constants");

//db functions
function createOrConnectPayrollDatabase() {
  return new sqlite3.Database("payroll.db", (error) => {
    if (error) {
      return console.error(error.message);
    }
  });
}

function createTableIfNotExist(db) {
  db.run(constants.CREATE_TABLE_QUERY, [], (error) => {
    if (error) {
      return console.error(error.message);
    }
  });
}

function selectAndSendPayrollData(db, res) {
  db.all(constants.SELECT_TABLE_QUERY, [], async (error, dataRows) => {
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

const numberOfDaysPerMonth = {
  1: "31",
  2: "28",
  3: "31",
  4: "30",
  5: "31",
  6: "30",
  7: "31",
  8: "31",
  9: "30",
  10: "31",
  11: "30",
  12: "31",
};

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
      endDate: `${year}-${month}-${numberOfDaysPerMonth[parseInt(month)]}`,
    },
  };
}

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

const sendPayrollData = async (data) => {
  const employeeData = [];
  data.forEach((singleEmployee, index) => {
    const { payPeriod } = getPayPeriod(singleEmployee.date);
    let indexOfMatch = -1;

    const employee = employeeData.find((employee) => {
      return (
        employee?.employeeId === singleEmployee.employee_id &&
        employee.payPeriod.startDate === payPeriod.startDate
      );
    });

    //get the index of the match
    indexOfMatch = employeeData.indexOf(employee);

    const rate = singleEmployee.group_name === "A" ? 20 : 30;

    if (indexOfMatch !== -1) {
      employeeData[indexOfMatch].hours += parseInt(singleEmployee.hours);
      employeeData[indexOfMatch].amountPaid =
        employeeData[indexOfMatch].hours * rate;
    } else {
      employeeData[index] = {
        employeeId: singleEmployee.employee_id,
        payPeriod: payPeriod,
        hours: parseInt(singleEmployee.hours),
        amountPaid: parseInt(singleEmployee.hours) * rate,
      };
    }
  });
  const finalData = await makeFinalData(employeeData);
  return finalData;
};

function insertDataIntoTable(csvData, res) {
  let db = createOrConnectPayrollDatabase();

  db.serialize(() => {
    createTableIfNotExist(db);

    csvData.forEach((row) => {
      db.run(constants.INSERT_TABLE_QUERY, row, (error) => {
        if (error) {
          return console.log(error.message);
        }
      });
    });

    db.all(constants.SELECT_TABLE_QUERY, [], (error) => {
      if (error) {
        return console.log(error.message);
      }
      res.status(200).send("Created Successfully");
    });
  });

  closeDatabaseConnection(db);
}

module.exports = {
  insertDataIntoTable,
  selectAndSendPayrollData,
  createTableIfNotExist,
  createOrConnectPayrollDatabase,
};
