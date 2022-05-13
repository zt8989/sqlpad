import express from "express";
import * as path from "path";

const app = express();

app.use(express.static(path.join(__dirname, "..", "dist")));

app.listen(process.env.PORT || 3000);
