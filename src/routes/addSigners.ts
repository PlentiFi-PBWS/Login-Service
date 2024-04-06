import { Request, Response, Router, json } from "express";
import { multisign, SignerEntry, SignerListSet, Wallet } from 'xrpl';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { connectToXrpl, MultiSigLoginData } from "../xrplUtils";

dotenv.config();



export interface MultiSigUpdateData {  // todo: add a signature mechanism to ensure the data is coming from the right source
  multisigAddress: string;
  newSigners: SignerEntry[];
  quorum: number;
  loginData: MultiSigLoginData;
}

const router: Router = Router();
router.use(json());
router.post("/", async (req: Request, res: Response) => {
  console.log("updateSigners request: ", req.body);
  try {
    const client = await connectToXrpl();

    const body = req.body;// as MultiSigUpdateData

    // console.log("body: ", body);
    const addSignerTx = {
      TransactionType: "SignerListSet",
      Account: body.multisigAddress,
      SignerQuorum: 2,
      SignerEntries: body.newSigners.map(signer => ({ SignerEntry: signer })),
      Fee: '1200'
    } satisfies SignerListSet;

    // console.log("addSignerTx: ", addSignerTx);

    const prepared = await client.autofill(addSignerTx);

    // setup loginService and user wallets
    const loginServiceWallet = Wallet.fromSeed(process.env.LOGIN_SERVICE_SEED as string);
    const userWallet = Wallet.fromEntropy(Buffer.from(
      crypto.createHash('sha256').update(body.loginData.login + body.loginData.password).digest('hex')
    ));

    const { tx_blob } = loginServiceWallet.sign(prepared, true);
    const { tx_blob: userTxBlob } = userWallet.sign(prepared, true);

    const multiSignedTx = multisign([tx_blob, userTxBlob]);

    const submitResult = await client.submit(multiSignedTx);
    console.log("submitResult: ", submitResult);

    if (submitResult.result.engine_result === 'tesSUCCESS') {
      res.status(200).send({
        message: "Signer added successfully"
      });
    } else {
      res.status(500).send({
        error: "Error adding signer: " + submitResult.result.engine_result
      });
    }

    await client.disconnect();
  } catch (e) {
    console.log(e);
    res.status(500).send({
      error: "Error setting up multisig"
    });
  }

});

export default router;
