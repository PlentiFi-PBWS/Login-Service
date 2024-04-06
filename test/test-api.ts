import { multisign, SignerListSet, Wallet } from "xrpl";
import { connectToXrpl } from "../src/xrplUtils";
import crypto from "crypto";
import dotenv from "dotenv";
import { MultisigSwapData } from "../src/routes/tx";
import { TokenInfo } from "../src/amm";

dotenv.config();

const loginData = {
  login: "string",
  password: "string",
}

async function test() {
  // post loginData to http://localhost:3001/setup
  const response = await fetch("http://localhost:3001/setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(loginData),
  });

  const data: {
    multisigAddress: string,
    signers: string[],
    yourSeed: string,
  } = await response.json();
  console.log(data);

  ///////////////////////////
  const newSigner = Wallet.generate();

  // get the current signerList from the xrpl ws
  const client = await connectToXrpl();
  const multisigData = (await client.request({
    "id": 2,
    "command": "account_info",
    "account": data.multisigAddress,
    "ledger_index": "current",
    "queue": true,
    "signer_lists": true
  }))?.result?.account_data?.signer_lists[0];

  const signerList = multisigData?.SignerEntries?.map((entry: any) => entry.SignerEntry)
  const quorum: number = multisigData?.SignerQuorum;
  console.log(signerList, quorum);
  if (!signerList || quorum === undefined) {
    throw new Error("signerList or quorum not found");
  }

  // const signerEntries = signerList.map((entry: any) => ({
  //   Account: entry.Account,
  //   SignerWeight: entry.SignerWeight
  // }));
  // update the signerList with a new signer
  const updatedSignerEntries = [...signerList, {
    Account: newSigner.address,
    SignerWeight: 1
  }];

  console.log(updatedSignerEntries);

  const response2 = await fetch("http://localhost:3001/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      multisigAddress: data.multisigAddress,
      newSigners: updatedSignerEntries,
      quorum: 2,
      loginData: loginData,
    }),
  });

  console.log(await response2.json());

  await client.disconnect();
  //////////////////////////

  const response3 = await fetch("http://localhost:3001/tx", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      txType: "Payment",
      multisigAddress: data.multisigAddress,
      loginData: {
        login: "string",
        password: "string",
      },
      destination: Wallet.generate().address,
      amount: "11000000", // in drops (smallest unit of XRP)
      loginService: "true",
      fee: "12000",
    }),
  });

  console.log(await response3.json());
}

// test().then(() => console.log("done"));




const body = {
  txType: "Swap",
  login: "string",
  password: "string",
  token1: {
    currency: null,
    value: "100000",
    issuer: null
  } satisfies TokenInfo,
  token2: {
    currency: 'TST',
    value: '1',
    issuer: 'rnzKj7qNm5ntyogctbQtNVCPnntMpeizx8',
} satisfies TokenInfo,
  tokenIn: { currency: null, amount: "1" },
  tokenOut: { currency: 'TST', amount: "15" },
} satisfies MultisigSwapData;

async function testSwap() {
  const response = await fetch("http://localhost:3001/tx", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  console.log(await response.json());
}

testSwap().then(() => console.log("done"));