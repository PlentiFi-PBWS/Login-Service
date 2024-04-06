import express, { Express } from "express";
import cors from "cors";
import setupMultisig from "./routes/setupMultisig";
import addSigners from "./routes/addSigners";
import tx from "./routes/tx";

//declare a new express app
const app: Express = express();

// Allow requests from all origins
const corsOptions = {
  origin: "*",
};

app.use(cors(corsOptions));

app.use("/setup", setupMultisig);
app.use("/add", addSigners);
app.use("/tx", tx);


export default app;