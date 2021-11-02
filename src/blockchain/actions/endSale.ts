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
  AuctionView,
} from '..';
import { claimUnusedPrizes } from './claimUnusedPrizes';
import { endAuction } from '../instructions-builder/metaplex/endAuction';

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

  const endAuctionInstr = await endAuction(
    new PublicKey(vault.pubkey),
    new PublicKey(auctionManager.data.info.authority)
  );

  const { instructions: claimInstructions, signers: claimSigners } =
    await claimUnusedPrizes(connection, wallet, auctionView);

  const instructions = [endAuctionInstr, ...claimInstructions];
  const signers = [[], ...claimSigners];

  console.log('instructions: ', instructions);
  console.log('signers: ', signers);

  // return sendTransactions(connection, wallet, instructions, signers);
}
