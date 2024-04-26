// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import connectDB from "./db/index.js";
import { app } from "./app.js";
connectDB()
  .then((value) => {
    let myport = process.env.PORT || 8000;
    app.on("error", (err) => {
      console.log("Error in running app ", err);
      process.exit(1);
    });
    app.listen(myport, () => {
      console.log(`Server is running at ${myport}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection Failed ", err);
  });

/*

first approach
import express from "express";

const app = express();

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("Err: ", error);
      throw error;
    });

    app.listen(process.env.PORT, () => {
      console.log(`App is listening on PORT ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Error: ", error);
    throw error;
  }
})();

Second Approach
*/
