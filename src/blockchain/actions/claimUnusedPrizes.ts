// import { Error } from '@solana/wallet-adapter-base';
import { AccountLayout } from '@solana/spl-token';
import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  AuctionViewItem,
  ParsedAccount,
  PartialAuctionView,
  redeemFullRightsTransferBid,
  SafetyDepositBox,
  toPublicKey,
  WalletSigner,
  WinningConfigType,
} from '..';
import safetyDepositAccount from '../../mock/cache/safetyDepositAccount';
import { createTokenAccount } from '../transactions/common';
import {
  ITransactionBuilder,
  ITransactionBuilderBatch,
} from './../models/types';

export async function claimUnusedPrizes(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: PartialAuctionView
  // accountsByMint: Map<string, TokenAccount>,
  // bids: ParsedAccount<BidderMetadata>[],
  // bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>,
  // prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>,
): Promise<ITransactionBuilderBatch> {
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  const signers: Keypair[][] = [];
  const instructions: TransactionInstruction[][] = [];

  for (
    let winnerIndex = 0;
    winnerIndex < auctionView.auctionManager.data.info.numWinners.toNumber();
    winnerIndex++
  ) {
    const winningSet = auctionView.items[winnerIndex];

    for (let i = 0; i < winningSet.length; i++) {
      const item = winningSet[i];

      const safetyDeposit = item.safetyDeposit;
      const tokenBalance = await connection.getTokenAccountBalance(
        toPublicKey(safetyDeposit.info.store)
      );
      // If box is empty, we cant redeem this. Could be broken AM we are claiming against.
      if (tokenBalance.value.uiAmount === 0) {
        console.log('Skipping', i, ' due to empty balance');
        continue;
      }
      if (
        winnerIndex < auctionView.auction.data.info.bidState.bids.length &&
        item.winningConfigType != WinningConfigType.PrintingV2
      ) {
        continue;
      }

      switch (item.winningConfigType) {
        case WinningConfigType.FullRightsTransfer:
          console.log('Redeeming Full Rights');
          const { instructions: redeemInstr, signers: redeemSigners } =
            await setupRedeemFullRightsTransferInstructions(
              auctionView,
              // accountsByMint,
              accountRentExempt,
              wallet,
              safetyDeposit,
              item,
              winnerIndex
            );
          instructions.push(redeemInstr);
          signers.push(redeemSigners);
          break;
      }
    }
  }
  return {
    instructions,
    signers,
  };
}

async function setupRedeemFullRightsTransferInstructions(
  auctionView: PartialAuctionView,
  // accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  wallet: WalletSigner,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  winningConfigIndex: number
): Promise<ITransactionBuilder> {
  if (!wallet.publicKey) throw new Error();

  const winningPrizeSigner: Keypair[] = [];
  const winningPrizeInstructions: TransactionInstruction[] = [];
  const claimed = auctionView.auctionManager.data.info.isItemClaimed(
    winningConfigIndex,
    safetyDeposit.info.order
  );
  // signers.push(winningPrizeSigner);
  // instructions.push(winningPrizeInstructions);
  if (!claimed) {
    // ~~~~~~~GET REAL DATA ~~~~~~~
    // let newTokenAccount = accountsByMint.get(
    //   safetyDeposit.info.tokenMint
    // )?.pubkey;
    //
    // ~~~~~ REPLACE THIS ~~~~~~
    let newTokenAccount = safetyDepositAccount.pubkey;
    if (!newTokenAccount) {
      const createTokenBuilder = createTokenAccount(
        wallet.publicKey,
        accountRentExempt,
        toPublicKey(safetyDeposit.info.tokenMint),
        wallet.publicKey
      );

      winningPrizeInstructions.push(
        ...createTokenBuilder.transaction.instructions
      );
      winningPrizeSigner.push(...createTokenBuilder.transaction.signers);
      newTokenAccount = createTokenBuilder.account.toBase58();
    }

    const redeemFullInstr = await redeemFullRightsTransferBid(
      auctionView.auctionManager.data.info.vault,
      safetyDeposit.info.store,
      newTokenAccount,
      safetyDeposit.pubkey,
      auctionView.vault.data.info.fractionMint,
      wallet.publicKey.toBase58(),
      wallet.publicKey.toBase58(),
      item.metadata.pubkey,
      wallet.publicKey.toBase58(),
      winningConfigIndex
    );
    winningPrizeInstructions.push(redeemFullInstr);
  }
  return {
    instructions: winningPrizeInstructions,
    signers: winningPrizeSigner,
  };
}
