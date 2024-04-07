import { Request, Response, Router, json } from "express";
import dotenv from 'dotenv';
import { connectToXrpl } from "../xrplUtils";
import { GatewayBalance } from "xrpl";

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
      "id": "example_gateway_balances_1",
      "command": "gateway_balances",
      "account": xrplAddress,
      "ledger_index": "validated"
    });

    console.log("response: ", response);
    // const jsonResponse = await response.json();
    // console.log("response: ", jsonResponse.account_data.Balance);

    const allBalances = response.result.assets as { [address: string]: GatewayBalance[] };
    let sum = 0;
    // for each key in allBalances, sum the balance if currency = "WHT"
    for (const key in allBalances) {
      for (const balance of allBalances[key]) {
        if (balance.currency === "WHT") {
          sum += Number(balance.value);
        }
      }
    }


    res.json({
      whtBalance: sum
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
