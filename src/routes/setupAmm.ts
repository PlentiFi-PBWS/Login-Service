import { Request, Response, Router, json } from "express";
import { Client, SignerListSet, Wallet } from 'xrpl';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { connectToXrpl } from "../xrplUtils";
import { MultiSigLoginData } from "../xrplUtils";
import { acquireTokens, AmmInfo, checkExistsAmm, confirmAmm, createAmm, depositAmm, get_new_token, getAmmcost, TokenInfo } from "../amm";
import { info } from "console";

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


const router: Router = Router();
router.use(json());
router.post("/", async (req: Request, res: Response) => {
  try {
    const client = await connectToXrpl();

    await client.disconnect();
    // return the multisig address and the signers addresses
    res.json({

    });
  } catch (e) {
    console.log(e);
    res.status(500).send({
      error: "Error setting up multisig"
    });
  }

});

export default router;


// inspired from xrpl snippet example
async function setupAmmNoXRP(token1: string, token2: string, token1Amount: string, token2Amount: string, client: Client) {
  // Get credentials from the Faucet ------------------------------------------
  console.log("Requesting address from the faucet...")
  const wallet = (await client.fundWallet()).wallet

  const msh_amount = await get_new_token(client, wallet, token1, token1Amount)
  const foo_amount = await get_new_token(client, wallet, token2, token2Amount)

  // Acquire tokens -----------------------------------------------------------
  await acquireTokens(client, wallet, msh_amount);
  await acquireTokens(client, wallet, foo_amount);

  // create AMM Info
  const amm_info_request: AmmInfo = {
    "command": "amm_info",
    "asset": {
      "currency": msh_amount.currency!,
      "issuer": msh_amount.issuer!,
    },
    "asset2": {
      "currency": foo_amount.currency!,
      "issuer": foo_amount.issuer!
    },
    "ledger_index": "validated"
  }


  // Check if AMM already exists ----------------------------------------------
  await checkExistsAmm(client, amm_info_request, msh_amount, foo_amount);

  // Look up AMM transaction cost ---------------------------------------------
  const amm_fee_drops = await getAmmcost(client);

  // Create AMM ---------------------------------------------------------------
  // This example assumes that 15 TST ≈ 100 FOO in value.
  await createAmm(client, wallet, msh_amount, foo_amount, amm_fee_drops)

  // Confirm that AMM exists --------------------------------------------------
  const {
    account_lines_result: account_lines_result,
    ammInfo: ammInfo
  } = await confirmAmm(client, wallet, amm_info_request);

  // console.log("account_lines_result:", account_lines_result)
  console.log("ammAddress:", ammInfo.issuer)

  // deposit AMM
  await depositAmm(client, wallet, msh_amount, token1Amount, foo_amount, token2Amount);

  return {
    token1: msh_amount,
    token1Issuer: msh_amount.issuer,
    token2: foo_amount,
    token2Issuer: foo_amount.issuer
  }
}

// inspired from xrpl snippet example
async function setupAmmXRP(token: string, tokenAmount: string, xrpAmount: string, client: Client) {
  console.log("Requesting address from the faucet...")
  const wallet = (await client.fundWallet()).wallet

  const msh_amount = await get_new_token(client, wallet, token, tokenAmount)
  // create AMM Info (another XRP pattern)
  const amm_info_request2: AmmInfo = {
    "command": "amm_info",
    "asset": {
      "currency": msh_amount.currency!,
      "issuer": msh_amount.issuer!,
    },
    "asset2": {
      "currency": "XRP",
      "issuer": null
    },
    "ledger_index": "validated"
  }

  // create XRP Amount info
  const xrpInfo: TokenInfo = {
    "currency": null,
    "value": "10000000",
    "issuer": null
  }

  // Check if AMM already exists ----------------------------------------------
  await checkExistsAmm(client, amm_info_request2, msh_amount, xrpInfo);
  // Look up AMM transaction cost ---------------------------------------------
  const amm_fee_drops = await getAmmcost(client);
  // Create AMM ---------------------------------------------------------------
  // This example assumes that 15 TST ≈ 100 FOO in value.
  await createAmm(client, wallet, msh_amount, xrpInfo, amm_fee_drops)

  // Confirm that AMM exists --------------------------------------------------
  const {
    ammInfo: ammInfo2
  } = await confirmAmm(client, wallet, amm_info_request2);

  console.log("ammAddress2:", ammInfo2.issuer)
  // deposit AMM
  await depositAmm(client, wallet, msh_amount, tokenAmount, xrpInfo, xrpAmount)

  return {
    token: msh_amount,
    tokenIssuer: msh_amount.issuer,
  }
}