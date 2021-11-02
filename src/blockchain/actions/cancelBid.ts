import { ITransactionBuilder } from './../models/types';
import { AccountLayout, MintInfo } from '@solana/spl-token';
import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  AuctionState,
  cancelBid,
  ensureWrappedAccount,
  ParsedAccount,
  PartialAuctionView,
  sendTransactions,
  sendTransactionWithRetry,
  SequenceType,
  StringPublicKey,
  TokenAccount,
  toPublicKey,
  WalletSigner,
} from '..';
import mintMock from '../../mock/cache/mintMock';
import tokenAccountMock from '../../mock/cache/tokenAccountMock';
import { claimUnusedPrizes } from './claimUnusedPrizes';
import { setupPlaceBid } from './sendPlaceBid';

export async function sendCancelBid(
  connection: Connection,
  wallet: WalletSigner,
  payingAccount: StringPublicKey,
  auctionView: PartialAuctionView
  // accountsByMint: Map<string, TokenAccount>,
  // bids: ParsedAccount<BidderMetadata>[],
  // bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>,
  // prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>
) {
  if (!wallet.publicKey) throw new Error();

  const signers: Array<Keypair[]> = [];
  const instructions: Array<TransactionInstruction[]> = [];

  if (
    auctionView.auction.data.info.ended() &&
    auctionView.auction.data.info.state !== AuctionState.Ended
  ) {
    const { instructions: placeBidInstr, signers: placeBidSigners } =
      await setupPlaceBid(connection, wallet, payingAccount, auctionView, 0);
    instructions.push(placeBidInstr);
    signers.push(placeBidSigners);
  }

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  const { signers: cancelSigners, instructions: cancelInstr } =
    await setupCancelBid(auctionView, accountRentExempt, wallet);
  signers.push(cancelSigners);
  instructions.push(cancelInstr);

  if (
    wallet.publicKey.equals(
      toPublicKey(auctionView.auctionManager.data.info.authority)
    ) &&
    auctionView.auction.data.info.ended()
  ) {
    // ~~~~~~~~~~TODO - UNCOMMENT THIS!!!!!! ~~~~~~
    await claimUnusedPrizes(
      connection,
      wallet,
      auctionView,
      // accountsByMint,
      // bids,
      // bidRedemptions,
      // prizeTrackingTickets,
      signers,
      instructions
    );
  }

  instructions.length === 1
    ? await sendTransactionWithRetry(
        connection,
        wallet,
        instructions[0],
        signers[0],
        'single'
      )
    : await sendTransactions(
        connection,
        wallet,
        instructions,
        signers,
        SequenceType.StopOnFailure,
        'single'
      );
}
export async function setupCancelBid(
  auctionView: PartialAuctionView,
  accountRentExempt: number,
  wallet: WalletSigner
): Promise<ITransactionBuilder> {
  if (!wallet.publicKey) throw new Error();

  const cancelSigners: Keypair[] = [];
  const cancelInstructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];

  const finalInstructions: TransactionInstruction[] = [];
  const finaSigners: Keypair[] = [];

  // ~~~~~~~GET REAL DATA ~~~~~~~
  // const tokenAccount = accountsByMint.get(
  //   auctionView.auction.data.info.tokenMint
  // );
  // const mint = cache.get(auctionView.auction.data.info.tokenMint);

  // ~~~~~ REPLACE THIS ~~~~~~
  const tokenAccount = tokenAccountMock as any as TokenAccount;
  const mint = mintMock as any as ParsedAccount<MintInfo>;

  if (mint && auctionView.myBidderPot) {
    const wrappedAccBuilder = ensureWrappedAccount(
      tokenAccount,
      wallet.publicKey,
      accountRentExempt
    );

    let receivingSolAccount;
    if (typeof wrappedAccBuilder !== 'string') {
      cancelInstructions.push(...wrappedAccBuilder.instructions);
      cleanupInstructions.push(...wrappedAccBuilder.cleanupInstructions);
      cancelSigners.push(...wrappedAccBuilder.signers);
      receivingSolAccount = wrappedAccBuilder.account;
    } else {
      receivingSolAccount = wrappedAccBuilder;
    }

    const cancelBidInstr = await cancelBid(
      wallet.publicKey.toBase58(),
      receivingSolAccount,
      auctionView.myBidderPot.data.info.bidderPot,
      auctionView.auction.data.info.tokenMint,
      auctionView.vault.pubkey
    );
    cancelInstructions.push(cancelBidInstr);

    finaSigners.push(...cancelSigners);
    finalInstructions.push(...[...cancelInstructions, ...cleanupInstructions]);
  }
  return {
    instructions: finalInstructions,
    signers: finaSigners,
  };
}
