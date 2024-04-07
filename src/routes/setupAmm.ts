import { Request, Response, Router, json } from "express";
import { Client, SignerListSet, Wallet } from 'xrpl';
import dotenv from 'dotenv';
import { connectToXrpl, MultiSigLoginData } from "../xrplUtils";
import { initAmm } from "../initAmm";
import crypto from "crypto";

dotenv.config();

export interface SetupAmmData {
  login: string;
  password: string;
  multisigAddress: string;
}
// useless
const router: Router = Router();
router.use(json());
router.post("/", async (req: Request, res: Response) => {
  try {

    const data = req.body as SetupAmmData;

    const client = await connectToXrpl();
    const signer = Wallet.fromEntropy(Buffer.from(
      crypto
        .createHash('sha256')
        .update(data.login + data.password)
        .digest()
        .toString('hex')
    ));
    console.log("signer: ", signer.address);
    // const out = await initAmm(signer, client, signer, pool, data.multisigAddress);
    await client.disconnect();
    // return the multisig address and the signers addresses
    // res.json(out);
    res.json({ msg: "done" });
  } catch (e) {
    console.log(e);
    res.status(500).send({
      error: "Error setting up multisig"
    });
  }

});

export default router;

