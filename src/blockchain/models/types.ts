// import { WalletAdapter } from '@solana/wallet-adapter-base';
import { AccountInfo, PublicKey, Transaction } from '@solana/web3.js';
import {
  AuctionData,
  AuctionDataExtended,
  AuctionManager,
  AuctionViewItem,
  BidderMetadata,
  BidderPot,
  BidRedemptionTicket,
  SafetyDepositBox,
  Vault,
} from '../instructions-builder/main';
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

export interface Auction {
  name: string;
  auctionerName: string;
  auctionerLink: string;
  highestBid: number;
  solAmt: number;
  link: string;
  image: string;
}

export interface Artist {
  address?: string;
  name: string;
  link: string;
  image: string;
  itemsAvailable?: number;
  itemsSold?: number;
  about?: string;
  verified?: boolean;
  background?: string;
  share?: number;
}

export enum ArtType {
  Master,
  Print,
  NFT,
}
export interface Art {
  uri: string | undefined;
  mint: string | undefined;
  link: string;
  title: string;
  artist: string;
  seller_fee_basis_points?: number;
  creators?: Artist[];
  type: ArtType;
  edition?: number;
  supply?: number;
  maxSupply?: number;
}

export interface Presale {
  targetPricePerShare?: number;
  pricePerShare?: number;
  marketCap?: number;
}

export enum AuctionViewState {
  Live = '0',
  Upcoming = '1',
  Ended = '2',
  BuyNow = '3',
  Defective = '-1',
}

export interface AuctionView {
  // items 1:1 with winning configs FOR NOW
  // once tiered auctions come along, this becomes an array of arrays.
  items: AuctionViewItem[][];
  safetyDepositBoxes: ParsedAccount<SafetyDepositBox>[];
  auction: ParsedAccount<AuctionData>;
  auctionDataExtended?: ParsedAccount<AuctionDataExtended>;
  auctionManager: AuctionManager;
  participationItem?: AuctionViewItem;
  state: AuctionViewState;
  thumbnail: AuctionViewItem;
  myBidderMetadata?: ParsedAccount<BidderMetadata>;
  myBidderPot?: ParsedAccount<BidderPot>;
  myBidRedemption?: ParsedAccount<BidRedemptionTicket>;
  vault: ParsedAccount<Vault>;
  totallyComplete: boolean;
  isInstantSale: boolean;
}

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
