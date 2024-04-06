import { Request, Response, Router, json } from "express";
import { Client, SignerListSet, Wallet } from 'xrpl';
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


const router: Router = Router();
router.use(json());
router.post("/", async (req: Request, res: Response) => {
  try {
    const client = await connectToXrpl();

    const creationData = req.body as MultiSigLoginData;

    const multisig = Wallet.generate();
    // Concatenate login and password + hash them to create 32 bytes of entropy
    const firstSignerEntropy = Buffer.from(
      crypto
        .createHash('sha256')
        .update(creationData.login + creationData.password)
        .digest()
        .toString('hex')
    );
    const firstSigner = Wallet.fromEntropy(firstSignerEntropy);
    const secondSigner = Wallet.generate();
    const loginService = Wallet.fromSeed(process.env.LOGIN_SERVICE_SEED!);
    await client.fundWallet(multisig);

    const allSigners = [loginService.address, firstSigner.address, secondSigner.address];

    await setupMultisig(client, multisig, allSigners.map(address => [address, 1]), 2);
    // todo : remove multisig private key access to the account
    console.log("multisig address: ", multisig.address);

    await client.disconnect();

    // return the multisig address and the signers addresses
    res.json({
      multisigAddress: multisig.address,
      signers: allSigners,
      yourSeed: firstSigner.seed,
    });
  } catch (e) {
    console.log(e);
    res.status(500).send({
      error: "Error setting up multisig"
    });
  }

});

export default router;
