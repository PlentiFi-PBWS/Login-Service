import { Request, Response, Router, json } from "express";
import { Client, multisign, Payment, SignerListSet, Wallet, xrpToDrops } from 'xrpl';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { connectToXrpl } from "../xrplUtils";
import { MultiSigLoginData } from "../xrplUtils";
import { AmmInfo, confirmAmm, swap, TokenInfo } from "../amm";

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
  token1: TokenInfo;
  token2: TokenInfo;
  tokenIn: { currency: string | null, amount: string };
  tokenOut: { currency: string| null, amount: string };
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
      const body: MultisigSwapData = req.body;

      const userAccount = Wallet.fromEntropy(Buffer.from(
        crypto
          .createHash('sha256')
          .update(body.login + body.password)
          .digest()
          .toString('hex')
      ))
      // console.log("userWallet: ", userWallet.address);

      console.log("1");
      // await client.fundWallet(userAccount); // todo: remove

      ///////////////////// GET AMM INFO /////////////////////
      // create AMM Info
      const amm_info_request: AmmInfo = {
        "command": "amm_info",
        "asset": {
          "currency": "XRP",//body.token1.currency!, ///// todo: remove hardcoded values
          "issuer": null, // body.token1.issuer!,
        },
        "asset2": {
          "currency": body.token2.currency!,
          "issuer": body.token2.issuer!
        },
        "ledger_index": "validated"
      }

      // console.log("amm_info_request: ", amm_info_request);
      console.log({ address: body.token1.issuer?? body.token2.issuer })
      const {
        account_lines_result: account_lines_result,
        ammInfo: ammInfo
      } = await confirmAmm(client, { address: body.token1.issuer?? body.token2.issuer }, amm_info_request);
      console.log("amm confirmed? ", account_lines_result, ammInfo);
      ///////////////////// SWAP /////////////////////
      const outputInfo = body.token1,
       inputInfo = body.token2;
      // Swap (payment Transaction) input ->> output
      const txHash = await swap(client, userAccount, ammInfo.issuer, outputInfo, inputInfo, body.tokenIn.amount, body.tokenOut.amount);

      if(txHash.length > 0) {
        res.status(200).send({
          message: "tx broadcasted successfully",
          hash: txHash
        });
      } else {
        res.status(500).send({
          error: "Error while swapping"
        });
      }

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
