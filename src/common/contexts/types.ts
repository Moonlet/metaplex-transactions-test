// import { WalletAdapter } from '@solana/wallet-adapter-base';
import { AccountInfo, PublicKey, Transaction } from '@solana/web3.js';
import {
  AuctionData,
  BidderMetadata,
  BidderPot,
  SafetyDepositBox,
  Vault,
} from '../actions';
import { AuctionManager, AuctionViewItem } from '../models';
import { StringPublicKey } from '../utils';

export interface ParsedAccountBase {
  pubkey: StringPublicKey;
  account?: AccountInfo<Buffer>;
  info: any; // TODO: change to unknown
}

export type AccountParser = (
  pubkey: StringPublicKey,
  data: AccountInfo<Buffer>
) => ParsedAccountBase | undefined;

export interface ParsedAccount<T> extends ParsedAccountBase {
  info: T;
}
export interface ParsedAccountV2<T> {
  pubkey: StringPublicKey;
  data: {
    type: string;
    info: T;
  };
}

export type PartialAuctionView = {
  auctionManager: ParsedAccountV2<AuctionManager>;
  vault: ParsedAccountV2<Vault>;
  auction: ParsedAccountV2<AuctionData>;
  safetyDepositBox?: ParsedAccountV2<SafetyDepositBox>; // to see if need
  myBidderPot?: ParsedAccountV2<BidderPot>; // current bid for the user for the auction
  // todo: I think need auctionDataExtended also
  items: AuctionViewItem[][]; // must add (I think we will have onle one item everytime)
  myBidderMetadata?: ParsedAccountV2<BidderMetadata>;
};

//todo: see thins
// export type WalletSigner = Pick<
//   WalletAdapter,
//   'publicKey' | 'signTransaction' | 'signAllTransactions'
// >;

export type WalletSigner = {
  publicKey: PublicKey | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transaction: Transaction[]) => Promise<Transaction[]>;
};

// export const TokenAccountParser = (
//   pubKey: StringPublicKey,
//   info: AccountInfo<Buffer>
// ) => {
//   // Sometimes a wrapped sol account gets closed, goes to 0 length,
//   // triggers an update over wss which triggers this guy to get called
//   // since your UI already logged that pubkey as a token account. Check for length.
//   if (info.data.length > 0) {
//     const buffer = Buffer.from(info.data);
//     const data = deserializeAccount(buffer);

//     const details = {
//       pubkey: pubKey,
//       account: {
//         ...info,
//       },
//       info: data,
//     } as TokenAccount;

//     return details;
//   }
// };

export const GenericAccountParser = (
  pubKey: StringPublicKey,
  info: AccountInfo<Buffer>
) => {
  const buffer = Buffer.from(info.data);

  const details = {
    pubkey: pubKey,
    account: {
      ...info,
    },
    info: buffer,
  } as ParsedAccountBase;

  return details;
};

// export const MintParser = (
//   pubKey: StringPublicKey,
//   info: AccountInfo<Buffer>
// ) => {
//   const buffer = Buffer.from(info.data);

//   const data = deserializeMint(buffer);

//   const details = {
//     pubkey: pubKey,
//     account: {
//       ...info,
//     },
//     info: data,
//   } as ParsedAccountBase;

//   return details;
// };
