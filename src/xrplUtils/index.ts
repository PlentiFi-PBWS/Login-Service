import dotenv from 'dotenv';
import { Client } from 'xrpl';

dotenv.config();

export const connectToXrpl = async () => {
  const client = new Client(process.env.XRPL_WSS_CLIENT);
  await client.connect();
  return client;
};

export interface MultiSigLoginData { // todo: add random salt
  login: string;
  password: string;
}