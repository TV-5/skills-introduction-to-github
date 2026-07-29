import express from "express";
import cors from "cors";
import "./db.js";
import { requirementsRouter } from "./routes/requirements.js";
import { assignmentsRouter } from "./routes/assignments.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api", requirementsRouter);
app.use("/api", assignmentsRouter);

app.listen(PORT, () => {
  console.log(`API requirements server listening on http://localhost:${PORT}`);
});
