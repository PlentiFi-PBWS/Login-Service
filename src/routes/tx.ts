import { Request, Response, Router, json } from "express";
import { Client, multisign, Payment, SignerListSet, Wallet, xrpToDrops } from 'xrpl';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { connectToXrpl } from "../xrplUtils";
import { MultiSigLoginData } from "../xrplUtils";

dotenv.config();

// signers = [address, weight]
const setupMultisig = async (client: Client, multisigWallet: Wallet, signers: [string, number][], quorum: number) => {
  const signerEntries = signers.map(signer => ({
    SignerEntry: {
      Account: signer[0],
      SignerWeight: signer[1]
    }
  }));

  const transaction = {
    TransactionType: 'SignerListSet',
    Account: multisigWallet.address,
    SignerQuorum: quorum,
    SignerEntries: signerEntries
  } satisfies SignerListSet;

  const prepared = await client.autofill(transaction);
  const signed = multisigWallet.sign(prepared);

  const result = await client.submit(signed.tx_blob);
  console.log("setup result: ", result);
};

export interface PaymentRequestData {
  txType: "Payment";
  multisigAddress: string;
  loginData: {
    login: string;
    password: string;
  }
  destination: string;
  amount: string; // in drops (smallest unit of XRP)
  loginService: "true" | "false";
  fee: string;
}


const router: Router = Router();
router.use(json());
router.post("/", async (req: Request, res: Response) => {
  try {
    const client = await connectToXrpl();

    const data = req.body;

    if (data.txType === "Payment") {
      const paymentRequest = data as PaymentRequestData;

      const payment = {
        TransactionType: "Payment",
        Account: paymentRequest.multisigAddress,
        Amount: paymentRequest.amount,
        Destination: paymentRequest.destination,
        Fee: paymentRequest.fee
      } satisfies Payment;

      const fullTx = await client.autofill(payment);
      const loginService = Wallet.fromSeed(process.env.LOGIN_SERVICE_SEED as string);
      const userWallet = Wallet.fromEntropy(Buffer.from(
        crypto.createHash('sha256').update(paymentRequest.loginData.login + paymentRequest.loginData.password).digest('hex')
      ));
      const { tx_blob: tx_blob1 } = loginService.sign(fullTx, true);
      const { tx_blob: userTxBlob } = userWallet.sign(fullTx, true);

      const multiSignedTx = multisign([tx_blob1, userTxBlob]);

      const submitResult = await client.submit(multiSignedTx);
      console.log("submitResult: ", submitResult);
      if (submitResult.result.engine_result === 'tesSUCCESS') {
        res.status(200).send({
          message: "tx broadcasted successfully",
          hash: submitResult.result.tx_json.hash
        });
      } else {
        res.status(500).send({
          error: "Error building tx: " + submitResult.result.engine_result
        });
      }

    } else if (data.txType === "Swap") {
      res.status(400).send({
        error: "Swap tx not implemented yet"
      });
    } else {
      res.status(400).send({
        error: "Invalid txType"
      });
    }



    await client.disconnect();
  } catch (e) {
    console.log(e);
    res.status(500).send({
      error: "Error building tx"
    });
  }

});

export default router;
