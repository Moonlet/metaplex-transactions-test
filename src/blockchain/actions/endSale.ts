import { Connection, PublicKey } from '@solana/web3.js';
import {
  BidderMetadata,
  BidRedemptionTicket,
  ParsedAccount,
  PartialAuctionView,
  PrizeTrackingTicket,
  TokenAccount,
  WalletSigner,
} from '..';
import { endAuction } from '../instructions-builder/metaplex/endAuction';
import { claimUnusedPrizes } from './claimUnusedPrizes';

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
