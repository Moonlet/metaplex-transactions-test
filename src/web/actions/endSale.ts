import { WalletAdapter } from '@solana/wallet-adapter-base';
import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  BidderMetadata,
  BidRedemptionTicket,
  ParsedAccount,
  PartialAuctionView,
  PrizeTrackingTicket,
  TokenAccount,
  WalletSigner,
} from '../../common';
import { AuctionView } from '../types';
import { claimUnusedPrizes } from './claimUnusedPrizes';
import { endAuction } from './endAuction';

interface EndSaleParams {
  auctionView: PartialAuctionView;
  connection: Connection;
  accountByMint: Map<string, TokenAccount>;
  bids: ParsedAccount<BidderMetadata>[];
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>;
  prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>;
  wallet: WalletSigner;
}

export async function endSale({
  auctionView,
  connection,
  wallet,
}: EndSaleParams) {
  const { vault, auctionManager } = auctionView;

  const endAuctionInstructions: TransactionInstruction[] = [];
  await endAuction(
    new PublicKey(vault.pubkey),
    new PublicKey(auctionManager.data.info.authority),
    endAuctionInstructions
  );

  const claimInstructions: Array<TransactionInstruction[]> = [];
  const claimSigners: Array<Keypair[]> = [];
  await claimUnusedPrizes(
    connection,
    wallet,
    auctionView,
    claimSigners,
    claimInstructions
  );

  const instructions = [endAuctionInstructions, ...claimInstructions];
  const signers = [[], ...claimSigners];

  console.log('instructions: ', instructions);
  console.log('signers: ', signers);

  // return sendTransactions(connection, wallet, instructions, signers);
}
