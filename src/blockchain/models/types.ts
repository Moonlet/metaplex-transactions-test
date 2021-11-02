// import { WalletAdapter } from '@solana/wallet-adapter-base';
import {
  AccountInfo,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  AuctionData,
  BidderPot,
  BidderMetadata,
  AuctionDataExtended,
  AuctionManager,
  AuctionViewItem,
  BidRedemptionTicket,
  SafetyDepositBox,
  Vault,
  SafetyDepositConfig,
  SafetyDepositDraft,
} from '..';
import { StringPublicKey } from '../utils';
import BN from 'bn.js';

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

export interface SafetyDepositInstructionTemplate {
  box: {
    tokenAccount?: StringPublicKey;
    tokenMint: StringPublicKey;
    amount: BN;
  };
  draft: SafetyDepositDraft;
  config: SafetyDepositConfig;
}

// return types for functions used to build transcations
export interface ITransactionBuilder {
  instructions: TransactionInstruction[];
  signers: Keypair[];
}
export interface ITransactionBuilderBatch {
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}

export interface IAccountBuilder extends ITransactionBuilder {
  account: PublicKey;
}

export interface IApproveBuilder {
  instruction: TransactionInstruction;
  transferAuthority: Keypair;
  cleanupInstruction?: TransactionInstruction;
}
export interface IEnsureWrappedAccBuilder extends ITransactionBuilder {
  cleanupInstructions: TransactionInstruction[];
  account: string;
}

export interface ICreateAuctionManager extends ITransactionBuilderBatch {
  vault: StringPublicKey;
  auction: StringPublicKey;
  auctionManager: StringPublicKey;
}
