import { Request, Response, Router, json } from "express";
import { Client, multisign, Payment, SignerListSet, SubmitResponse, Wallet, xrpToDrops } from 'xrpl';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { connectToXrpl } from "../xrplUtils";
import { MultiSigLoginData } from "../xrplUtils";
import { acquireTokens, AmmInfo, confirmAmm, get_new_token, swap, TokenInfo } from "../try-to-use-amm/amm";

dotenv.config();

export interface Tx {
  txType: "Payment" | "Swap";
}

export interface PaymentRequestData extends Tx {
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

export interface MultisigSwapData extends Tx {
  login: string;
  password: string;
  tokenIn: { currency: string | null, amount: string, issuer: string | undefined };
  tokenOut: { currency: string | null, amount: string, issuer: string | undefined };
  poolSeed: string;
  multisigAddress: string;
}


const router: Router = Router();
router.use(json());
router.post("/", async (req: Request, res: Response) => {
  try {
    const client = await connectToXrpl();

    const data = req.body;

    if (data.txType === "Payment") {
      const paymentRequest = data as PaymentRequestData;

      const userWallet = Wallet.fromEntropy(Buffer.from(
        crypto.createHash('sha256').update(paymentRequest.loginData.login + paymentRequest.loginData.password).digest('hex')
      ));

      const payment = {
        TransactionType: "Payment",
        Account: paymentRequest.multisigAddress,
        Amount: paymentRequest.amount,
        Destination: paymentRequest.destination,
        Fee: paymentRequest.fee
      } satisfies Payment;

      const fullTx = await client.autofill(payment);
      const loginService = Wallet.fromSeed(process.env.LOGIN_SERVICE_SEED as string);

      console.log("user address: ", userWallet.address);
      const { tx_blob: tx_blob1 } = loginService.sign(fullTx, true);
      const { tx_blob: userTxBlob } = userWallet.sign(fullTx, true);
      console.log("tx signers: ", loginService.address, userWallet.address);
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
      const body: MultisigSwapData = req.body;

      const userAccount = Wallet.fromEntropy(Buffer.from(
        crypto
          .createHash('sha256')
          .update(body.login + body.password)
          .digest()
          .toString('hex')
      ));

      const wheat = (await get_new_token(client, userAccount, "WHT", body.tokenOut.amount, body.multisigAddress)) as {
        "currency": string,
        "value": string,
        "issuer": string,
        "txHash": string
      };

      await acquireTokens(client, userAccount, wheat, body.multisigAddress);

      console.log("tokens sent from wallet2 to wallet: ", wheat.txHash);
      // console.log("tokens sent from wallet2 to wallet: ", payment);

      // wallet send XRP to wallet2
      const raw_payment2 = {
        "TransactionType": "Payment",
        "Account": body.multisigAddress,
        "Destination": wheat.issuer,
        "Amount": body.tokenIn.amount,
        "Fee": "1200",
      } satisfies Payment;

      const fullPayment2 = await client.autofill(raw_payment2);
      const loginService = Wallet.fromSeed(process.env.LOGIN_SERVICE_SEED as string);
      const { tx_blob: tx_blob1 } = loginService.sign(fullPayment2, true);
      const { tx_blob: userTxBlob } = userAccount.sign(fullPayment2, true);
      const multisignedPayment2 = multisign([tx_blob1, userTxBlob]);

      const payment2: SubmitResponse = await client.submit(multisignedPayment2);

      console.log("XRP sent from wallet to wallet2: ", payment2.result);

      res.status(200).send({
        message: "Swap successful",
        hash: [wheat.txHash, "payment2.result.hash"],
      });
      return;

      // } else if (body.tokenOut.currency === "XRP") {
      //   // wallet1 send WHT tokens to wallet2
      //   const payment = await client.submitAndWait({
      //     "TransactionType": "Payment",
      //     "Account": userAccount.address,
      //     "Destination": pool.address,
      //     "Amount": {
      //       "currency": "WHT",
      //       "issuer": pool.address,
      //       "value": body.tokenIn.amount
      //     }
      //   }, {
      //     autofill: true,
      //     wallet: userAccount
      //   });
      //   console.log("tokens sent from wallet2 to wallet");
      //   console.log("tokens sent from wallet2 to wallet: ", payment);

      //   // wallet send XRP to wallet2
      //   const payment2 = await client.submitAndWait({
      //     "TransactionType": "Payment",
      //     "Account": pool.address,
      //     "Destination": userAccount.address,
      //     "Amount": body.tokenOut.amount,
      //   }, {
      //     autofill: true,
      //     wallet: pool
      //   });
      //   console.log("XRP sent from wallet to wallet2");
      //   console.log("XRP sent from wallet to wallet2: ", payment2);

      //   res.status(200).send({
      //     message: "Swap successful",
      //     hash: [payment.result.hash, payment2.result.hash],
      //   });
      // } else {
      //   res.status(400).send({
      //     error: "error while building tx"
      //   });
      // }

      await client.disconnect();
    } else {
      res.status(400).send({
        error: "Invalid txType"
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({
      error: "Error building tx"
    });
  }

});

export default router;
