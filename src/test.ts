// import { Client, multisign, Payment, SignerListSet, Transaction, Wallet, xrpToDrops } from 'xrpl';
import dotenv from 'dotenv';

import { Client, xrpToDrops } from "xrpl";
import { acquireTokens, AmmInfo, checkExistsAmm, confirmAmm, createAmm, depositAmm, get_new_token, getAmmcost, TokenInfo } from "./try-to-use-amm/amm";

dotenv.config();

const connectToXrpl = async () => {
  const client = new Client(process.env.XRPL_WSS_CLIENT);
  await client.connect();
  return client;
};

// const disconnectFromXrpl = async (client: Client) => {
//   await client.disconnect();
// }

// const setupMultisig = async (client: Client, multisigWallet: Wallet, signerAddresses: string[], quorum: number) => {
//   const signerEntries = signerAddresses.map(address => ({
//     SignerEntry: {
//       Account: address,
//       SignerWeight: 1
//     }
//   }));

//   const transaction = {
//     TransactionType: 'SignerListSet',
//     Account: multisigWallet.address,
//     SignerQuorum: quorum,
//     SignerEntries: signerEntries
//   } satisfies SignerListSet;

//   const prepared = await client.autofill(transaction);
//   const signed = multisigWallet.sign(prepared);

//   const result = await client.submit(signed.tx_blob); // works ??
//   console.log("setup result: ", result);
// };



// async function test() {

//   const client = await connectToXrpl();

//   const multisigWallet = Wallet.generate();
//   await client.fundWallet(multisigWallet);
//   console.log("multisigWallet: ", multisigWallet.address, " funded successfully");



//   const signers = [
//     Wallet.generate(),
//     Wallet.generate(),
//     Wallet.generate()
//   ];

//   const signerAddresses = signers.map(signer => signer.address);

//   await setupMultisig(client, multisigWallet, signerAddresses, 2);

//   // broadcast a tx using 2 of the signers
//   const amount = '11000000'; // Amount in XRP

//   const tx = {
//     TransactionType: "Payment",
//     Account: multisigWallet.address,
//     Amount: amount, // Amount in drops (1 XRP = 1,000,000 drops)
//     Destination: signers[2].address,
//     Fee: '1200', // Fee in drops
//   } satisfies Payment;

//   const fullTx = await client.autofill(tx);

//   const { tx_blob: tx_blob1 } = signers[0].sign(fullTx, true)
//   const { tx_blob: tx_blob2 } = signers[1].sign(fullTx, true)

//   console.log(fullTx);
//   const multisignedTx = multisign([tx_blob1, tx_blob2])

//   console.log("multisignedTx: \n", multisignedTx);


//   const submitResponse = await client.submit(multisignedTx);

//   console.log("payment tx hash: ", submitResponse.result.tx_json.hash);
//   console.log("sender: ", multisigWallet.address);
//   console.log("receiver: ", signers[2].address);

//   if (submitResponse.result.engine_result === 'tesSUCCESS') {
//     console.log('The multisigned transaction was accepted by the ledger:')
//     console.log(submitResponse)
//     if (submitResponse.result.tx_json.Signers) {
//       console.log(
//         `The transaction had ${submitResponse.result.tx_json.Signers.length} signatures`,
//       )
//     }
//   } else {
//     console.log(
//       "The multisigned transaction was rejected by rippled. Here's the response from rippled:",
//     )
//     console.log(submitResponse)
//   }  



//   // transaction from multisig private key
//   const payment = {
//     TransactionType: "Payment",
//     Account: multisigWallet.address,
//     Amount: xrpToDrops("11"),
//     Destination: signers[2].address,
//     Fee: xrpToDrops("0.000012")
//   } satisfies Payment;

//   const preparedPayment = await client.autofill(payment);
//   const signedPayment = multisigWallet.sign(preparedPayment);
//   // broadcast the payment
//   const paymentResult = await client.submit(signedPayment.tx_blob);
//   console.log("payment from multisig privateKey alone result: ", paymentResult);


//   // add a new signer
//   const newSigner = Wallet.generate();
//   const newSignerAddress = newSigner.address;
//   const newSignerWeight = 1;

//   const signerEntries = signerAddresses.map(address => ({
//     SignerEntry: {
//       Account: address,
//       SignerWeight: 1
//     }
//   }));

//   const addSignerTx = {
//     TransactionType: "SignerListSet",
//     Account: multisigWallet.address,
//     SignerQuorum: 2,
//     SignerEntries: [
//       {
//         SignerEntry: {
//           Account: newSignerAddress,
//           SignerWeight: newSignerWeight
//         }
//       }
//     ].concat(signerEntries),
//     Fee: '1200'
//   } satisfies SignerListSet;
// // console.log([
// //   {
// //     SignerEntry: {
// //       Account: newSignerAddress,
// //       SignerWeight: newSignerWeight
// //     }
// //   }
// // ].concat(signerEntries),);
//   const preparedAddSigner = await client.autofill(addSignerTx);
//   // 2 of the existing signers sign the transaction
//   const { tx_blob: tx_blob3 } = signers[0].sign(preparedAddSigner, true);
//   const { tx_blob: tx_blob4 } = signers[1].sign(preparedAddSigner, true);
//   const multisignedAddSignerTx = multisign([tx_blob3, tx_blob4]);
//   // broadcast the multisigned transaction
//   const addSignerResult = await client.submit(multisignedAddSignerTx);
//   console.log("addSigner using 2 current signers Result: ", addSignerResult);

//   await disconnectFromXrpl(client);
// }

// test().then(() => {
//   console.log("done");
// });

// // 32 bytes entropy
// // console.log(Wallet.fromEntropy([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]));


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

  // // deposit AMM
  // await depositAmm(client, wallet, msh_amount, token1Amount, foo_amount, token2Amount);
  // console.log({
  //   token1: msh_amount,
  //   token1Issuer: msh_amount.issuer,
  //   token2: foo_amount,
  //   token2Issuer: foo_amount.issuer
  // });
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
  await acquireTokens(client, wallet, msh_amount);

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
    "value":xrpToDrops(xrpAmount), 
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
  // // deposit AMM
  // await depositAmm(client, wallet, msh_amount, tokenAmount, xrpInfo, xrpAmount)
  console.log({
    token: msh_amount,
    tokenIssuer: msh_amount.issuer,
  });

  return {
    token: msh_amount,
    tokenIssuer: msh_amount.issuer,
  }
}


connectToXrpl().then(client => {
  setupAmmXRP("TST", "15", "1", client).then(() => {
    console.log("done");
  }).then(() => {
    client.disconnect();
  });
});