import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";

import connectDB from "./config/connectDB.js";

const app = express();

const PORT = process.env.PORT || 4000;

connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true }));

app.get("/", (req, res) => res.send("API working"));

app.listen(PORT, () => {
  console.log("Server started on PORT:", PORT);
});
