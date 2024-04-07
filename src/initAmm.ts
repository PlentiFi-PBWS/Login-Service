import { Client, multisign, TrustSet, Wallet } from "xrpl";
import { acquireTokens, get_new_token, TokenInfo } from "./try-to-use-amm/amm";
import dotenv from 'dotenv';

dotenv.config();

export async function initAmm(userAccount: Wallet, client: Client, wallet: Wallet, wallet2: Wallet, multisigAddress: string): Promise<{
  masterSeed: string,
  userSeed: string,
  currency: TokenInfo,
}> {

  // Get credentials from the Faucet ------------------------------------------
  console.log("Requesting address from the faucet...")

  // await client.fundWallet(wallet2);

  // console.log("wallet2 funded: ", wallet2.address);

  console.log("wallet funded: ", wallet.address);

  const wheat = await get_new_token(client, userAccount, "WHT", "1000000000", multisigAddress);
  // const salt = await get_new_token(client, wallet2, "SLT", "1000")

  await acquireTokens(client, userAccount, wheat, multisigAddress);
  // await acquireTokens(client, wallet2, wheat);
  // await acquireTokens(client, wallet2, salt);

  // OPEN TRUSTLINE
  const trustLineSetup = {
    "TransactionType": "TrustSet",
    "Account": multisigAddress,
    "LimitAmount": {
      "currency": wheat.currency,
      "issuer": wheat.issuer,
      "value": "100000000000"
    },
    Fee: "12000",
  } satisfies TrustSet;

  // console.log("trustline setup: ", trustLineSetup);

  const fullTx = await client.autofill(trustLineSetup);
  const loginService = Wallet.fromSeed(process.env.LOGIN_SERVICE_SEED as string);

  const { tx_blob: tx_blob1 } = loginService.sign(fullTx, true);
  const { tx_blob: userTxBlob } = wallet.sign(fullTx, true);
  const multiSignedTx = multisign([tx_blob1, userTxBlob]);

  const trust_result = await client.submit(multiSignedTx);

  // const trust_result = await client.submitAndWait({
  //   "TransactionType": "TrustSet",
  //   "Account": multisigAddress,
  //   "LimitAmount": {
  //     "currency": wheat.currency,
  //     "issuer": wheat.issuer,
  //     "value": "100000000000"
  //   }
  // }, {
  //   autofill: true,
  //   wallet: wallet
  // });
  console.log("trustline setup: ", trust_result);
  return {
    masterSeed: wallet2.seed,
    userSeed: wallet.seed,
    currency: wheat,
  };
  // // console.log("trust_result: ", trust_result);

  // // wallet2 send WHT tokens to wallet1
  // const payment = await client.submitAndWait({
  //   "TransactionType": "Payment",
  //   "Account": wallet2.address,
  //   "Destination": wallet.address,
  //   "Amount": {
  //     "currency": "WHT",
  //     "issuer": wallet2.address,
  //     "value": receive
  //   }
  // }, {
  //   autofill: true,
  //   wallet: wallet2
  // });
  // console.log("tokens sent from wallet2 to wallet");
  // // console.log("tokens sent from wallet2 to wallet: ", payment);

  // // wallet send XRP to wallet2
  // const payment2 = await client.submitAndWait({
  //   "TransactionType": "Payment",
  //   "Account": wallet.address,
  //   "Destination": wallet2.address,
  //   "Amount": send,
  // }, {
  //   autofill: true,
  //   wallet: wallet
  // });
  // console.log("XRP sent from wallet to wallet2");
  // // console.log("XRP sent from wallet to wallet2: ", payment2);

  // console.log("wallet2 funded: ", wallet2.address);

  // console.log("wallet funded: ", wallet.address);
}

// initAmm(Wallet.generate(), "1000000", "200").then(() => {
//   console.log("done")
//   process.exit(0)
// });

