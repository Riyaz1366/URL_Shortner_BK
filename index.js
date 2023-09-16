require("dotenv").config();

const express = require("express");

const mongoose = require("mongoose");

const cors = require("cors");

const routes = require("./route/route");

const url = process.env.MONGO_URL;
const port = process.env.PORT;
const app = express();
app.use(express.json());

app.use(cors());
app.set("view engine", "ejs");

mongoose.set("strictQuery", false);

mongoose.connect(url).then(() => {
  console.log("Mongodb Connected");
});

app.use("/", routes);

app.listen(port, () => {
  console.log("Running on Port");
});
