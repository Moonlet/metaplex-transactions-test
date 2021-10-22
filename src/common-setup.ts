import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { ENDPOINTS, WalletSigner } from './common';

export const connection = new Connection(ENDPOINTS[0].endpoint);

export const walletSinger: WalletSigner = {
  publicKey: new PublicKey('9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan'),
  signTransaction: (transaction: Transaction) =>
    Promise.resolve(new Transaction()), // mock
  signAllTransactions: (transaction: Transaction[]) => Promise.resolve([]), // mock
};
