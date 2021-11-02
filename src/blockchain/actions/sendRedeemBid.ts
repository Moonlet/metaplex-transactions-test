// import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { AccountLayout } from '@solana/spl-token';
import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  AuctionState,
  AuctionView,
  AuctionViewItem,
  BidderMetadata,
  BidRedemptionTicket,
  claimBid,
  createTokenAccount,
  getMetadata,
  NonWinningConstraint,
  ParsedAccount,
  PartialAuctionView,
  redeemFullRightsTransferBid,
  SafetyDepositBox,
  StringPublicKey,
  toPublicKey,
  updatePrimarySaleHappenedViaToken,
  WalletSigner,
  WinningConfigType,
  WinningConstraint,
} from '..';
import safetyDepositAccount from '../../mock/cache/safetyDepositAccount';
import {
  ITransactionBuilder,
  ITransactionBuilderBatch,
} from './../models/types';
import { setupCancelBid } from './cancelBid';
import { claimUnusedPrizes } from './claimUnusedPrizes';
import { setupPlaceBid } from './sendPlaceBid';

export function eligibleForParticipationPrizeGivenWinningIndex(
  winnerIndex: number | null,
  auctionView: AuctionView,
  bidderMetadata: ParsedAccount<BidderMetadata> | undefined,
  bidRedemption: ParsedAccount<BidRedemptionTicket> | undefined
) {
  const index =
    auctionView.auctionManager.participationConfig?.safetyDepositBoxIndex;
  if (index == undefined || index == null) {
    return false;
  }

  if (!bidderMetadata || bidRedemption?.info.getBidRedeemed(index))
    return false;

  return (
    (winnerIndex === null &&
      auctionView.auctionManager.participationConfig?.nonWinningConstraint !==
        NonWinningConstraint.NoParticipationPrize) ||
    (winnerIndex !== null &&
      auctionView.auctionManager.participationConfig?.winnerConstraint !==
        WinningConstraint.NoParticipationPrize)
  );
}

// this one is called by the winner
export async function sendRedeemBid(
  connection: Connection,
  wallet: WalletSigner,
  payingAccount: StringPublicKey,
  auctionView: PartialAuctionView
  // accountsByMint: Map<string, TokenAccount>,
  // prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>,
  // bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>,
  // bids: ParsedAccount<BidderMetadata>[]
): Promise<ITransactionBuilderBatch> {
  if (!wallet.publicKey) throw new Error();

  const signers: Keypair[][] = [];
  const instructions: TransactionInstruction[][] = [];

  if (
    auctionView.auction.data.info.ended() &&
    auctionView.auction.data.info.state !== AuctionState.Ended
  ) {
    // but whyyy???? (same for settle function)
    const { instructions: placeBidInstr, signers: placeBidSigners } =
      await setupPlaceBid(connection, wallet, payingAccount, auctionView, 0);
    instructions.push(placeBidInstr);
    signers.push(placeBidSigners);
  }

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  // const mintRentExempt = await connection.getMinimumBalanceForRentExemption(
  //   MintLayout.span,
  // );

  let winnerIndex: number | null = null;
  // the one from myBidderPot (me) is the winner
  if (auctionView.myBidderPot?.pubkey)
    winnerIndex = auctionView.auction.data.info.bidState.getWinnerIndex(
      auctionView.myBidderPot?.data.info.bidderAct
    );

  //if I won
  if (winnerIndex !== null) {
    // items is a prebuilt array of arrays where each entry represents one
    // winning spot, and each entry in it represents one type of item that can
    // be received.
    const winningSet = auctionView.items[winnerIndex];

    // only one will be, no need to iterate
    for (let i = 0; i < winningSet.length; i++) {
      const item = winningSet[i];
      const safetyDeposit = item.safetyDeposit;
      switch (item.winningConfigType) {
        // other types, but only FullRightsTransfer is used
        case WinningConfigType.FullRightsTransfer:
          // one this will remain
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

    if (auctionView.myBidderMetadata && auctionView.myBidderPot) {
      const claimSigners: Keypair[] = [];
      const claimInstructions: TransactionInstruction[] = [];
      instructions.push(claimInstructions);
      signers.push(claimSigners);
      console.log('Claimed');
      const claimBidInstr = await claimBid(
        auctionView.auctionManager.data.info.acceptPayment,
        auctionView.myBidderMetadata.data.info.bidderPubkey,
        auctionView.myBidderPot?.data.info.bidderPot,
        auctionView.vault.pubkey,
        auctionView.auction.data.info.tokenMint
        // claimInstructions
      );
      claimInstructions.push(claimBidInstr);
    }
  } else {
    // If you didnt win, you must have a bid we can refund before we check for open editions.
    const { signers: cancelSigners, instructions: cancelInstr } =
      await setupCancelBid(auctionView, accountRentExempt, wallet);
    signers.push(cancelSigners);
    instructions.push(cancelInstr);
  }

  // do we need this?
  if (
    wallet.publicKey.toBase58() ===
    auctionView.auctionManager.data.info.authority
  ) {
    const { instructions: claimInstructions, signers: claimSigners } =
      await claimUnusedPrizes(
        connection,
        wallet,
        auctionView
        // accountsByMint,
        // [], // dont reach the code where nedded beacause participationItem = undefined
        // {}, // dont reach the code where nedded beacause participationItem = undefined
        // {},
        // signers,
        // instructions
      );
    instructions.push(...claimInstructions);
    signers.push(...claimSigners);
  }

  return { instructions, signers };
}

async function setupRedeemFullRightsTransferInstructions(
  auctionView: PartialAuctionView,
  // accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  wallet: WalletSigner,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  winnerIndex: number
): Promise<ITransactionBuilder> {
  if (!wallet.publicKey) throw new Error();

  const winningPrizeSigner: Keypair[] = [];
  const winningPrizeInstructions: TransactionInstruction[] = [];

  const claimed = auctionView.auctionManager.data.info.isItemClaimed(
    winnerIndex,
    safetyDeposit.info.order
  );
  if (!claimed && auctionView.myBidderMetadata) {
    console.log('here setup redeem');

    // ~~~~~~~GET REAL DATA ~~~~~~~
    // let newTokenAccount = accountsByMint.get(
    //   safetyDeposit.info.tokenMint
    // )?.pubkey;
    //
    // ~~~~~ REPLACE THIS ~~~~~~
    let newTokenAccount = safetyDepositAccount.pubkey;

    if (!newTokenAccount) {
      const {
        account: tokenAcc,
        instructions: builderInstr,
        signers: builderSigners,
      } = createTokenAccount(
        wallet.publicKey,
        accountRentExempt,
        toPublicKey(safetyDeposit.info.tokenMint),
        wallet.publicKey
      );
      winningPrizeInstructions.push(...builderInstr);
      winningPrizeSigner.push(...builderSigners);
      newTokenAccount = tokenAcc.toBase58();
    }

    const redeemFullInstr = await redeemFullRightsTransferBid(
      auctionView.auctionManager.data.info.vault,
      safetyDeposit.info.store,
      newTokenAccount,
      safetyDeposit.pubkey,
      auctionView.vault.data.info.fractionMint,
      auctionView.myBidderMetadata.data.info.bidderPubkey,
      wallet.publicKey.toBase58(),
      item.metadata.pubkey,
      wallet.publicKey.toBase58()
    );

    winningPrizeInstructions.push(redeemFullInstr);

    const metadata = await getMetadata(safetyDeposit.info.tokenMint);
    const updatePrimaryInstr = updatePrimarySaleHappenedViaToken(
      metadata,
      wallet.publicKey.toBase58(),
      newTokenAccount
    );
    winningPrizeInstructions.push(updatePrimaryInstr);
  }
  return {
    instructions: winningPrizeInstructions,
    signers: winningPrizeSigner,
  };
}
