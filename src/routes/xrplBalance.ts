import { Request, Response, Router, json } from "express";
import dotenv from 'dotenv';
import { connectToXrpl } from "../xrplUtils";

dotenv.config();




const router: Router = Router();
router.use(json());
router.post("/", async (req: Request, res: Response) => {
  try {
    const client = await connectToXrpl();

    const data = req.body;

    const xrplAddress = data.xrplAddress;
    console.log("xrplAddress: ", xrplAddress);

    const response = await client.request({
      "id": 2,
      "command": "account_info",
      "account": xrplAddress,
      "ledger_index": "current",
      "queue": true,
      "signer_lists": true
    });
    
    console.log("response: ", response);
    // const jsonResponse = await response.json();
    // console.log("response: ", jsonResponse.account_data.Balance);
    res.json({
      xrplBalance: response.result.account_data.Balance
    });

    await client.disconnect();
  } catch (e) {
    console.log(e);
    res.status(500).send({
      error: "Error building tx"
    });
  }

});

export default router;
