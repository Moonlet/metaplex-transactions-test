import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  ENDPOINTS,
  ParsedAccount,
  WhitelistedCreator,
  WalletSigner,
} from './common';
import auctionSettings from './mock/auctionSettings';
import safetyDepositDraftsDummy from './mock/safetyDepositDrafts';
import whitelistedCreatorsByCreatorDummy from './mock/whitelistedCreatorsByCreator';
import {
  createAuctionManager,
  SafetyDepositDraft,
} from './web/actions/createAuctionManager';

const connection = new Connection(ENDPOINTS[0].endpoint);

const walletSinger: WalletSigner = {
  publicKey: new PublicKey('9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan'),
  signTransaction: (transaction: Transaction) =>
    Promise.resolve(new Transaction()), // mock
  signAllTransactions: (transaction: Transaction[]) => Promise.resolve([]), // mock
};

export const triggerAction = async () => {
  const whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  > = whitelistedCreatorsByCreatorDummy as any;

  const safetyDepositDrafts: SafetyDepositDraft[] =
    safetyDepositDraftsDummy as any;

  console.log('~~~~~~~INPUT DATA~~~~~~~');
  // console.log(auctionSettings);
  // console.log(safetyDepositDrafts);
  // console.log(whitelistedCreatorsByCreator);

  console.log('~~~~~~~START PROCESSING~~~~~~');
  const result = await createAuctionManager(
    connection,
    walletSinger,
    whitelistedCreatorsByCreator,
    auctionSettings,
    safetyDepositDrafts
  );

  console.log(result);

  console.log('~~~~~~~END PROCESSING~~~~~~');
};

triggerAction();
