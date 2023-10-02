require("dotenv").config();

const express = require("express");

const mongoose = require("mongoose");

const cors = require("cors");

const routes = require("./route/route");

const url = process.env.MONGO_URL;
const port = process.env.PORT;
const app = express();
app.use(express.json());
// app.use(express.static(path.join(__dirname, 'build')));
const bodyparser = require("body-parser");

app.use(cors());
app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({ extended: true }));
app.use(express.text({ type: "*/*" }));
app.use(express.static("public"));
mongoose.set("strictQuery", false);

mongoose
  .connect(url)
  .then(() => {
    console.log("Mongodb Connected");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

app.use("/", routes);

app.listen(port, () => {
  console.log("Running on Port");
});
