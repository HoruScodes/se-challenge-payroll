const express = require("express");
const app = express();
const csv = require("csvtojson");
const multer = require("multer");
const bodyParser = require("body-parser");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const {
  insertDataIntoTable,
  selectAndSendPayrollData,
  createTableIfNotExist,
  createOrConnectPayrollDatabase,
} = require("./lib/helper");

const upload = multer({
  storage: multer.memoryStorage(),
  inMemory: true,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

let fileUploadHistory = [];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  let db = createOrConnectPayrollDatabase();
  db.serialize(() => {
    createTableIfNotExist(db);
    selectAndSendPayrollData(db, res);
  });
});

app.post("/add", upload.single("upload-single"), (req, res) => {
  if (req.file) {
    if (fileUploadHistory.indexOf(req.file.originalname) > -1) {
      res.status(404).send("Already Uploaded");
    } else {
      let csvString = req.file.buffer.toString();
      csv({ noheader: false, output: "csv" })
        .fromString(csvString)
        .then((csvRow) => {
          if (csvRow.length === 0) {
            res.status(404).send("Empty File");
            return;
          }
          fileUploadHistory.push(req.file.originalname);
          insertDataIntoTable(csvRow, res, prisma);
        });
    }
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
