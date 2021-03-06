import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  AuctionState,
  BidderPot,
  claimBid,
  createAssociatedTokenAccountInstruction,
  emptyPaymentAccount,
  findProgramAddress,
  ParsedAccount,
  PartialAuctionView,
  programIds,
  sendTransactions,
  sendTransactionWithRetry,
  SequenceType,
  toPublicKey,
  WalletSigner,
  QUOTE_MINT,
} from '..';
import { setupPlaceBid } from './sendPlaceBid';

const BATCH_SIZE = 10;
const SETTLE_TRANSACTION_SIZE = 6;
const CLAIM_TRANSACTION_SIZE = 6;

// this is called by the auctioneer
export async function settle(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: PartialAuctionView,
  bidsToClaim: ParsedAccount<BidderPot>[], // only one winner every time?
  payingAccount: string | undefined
): Promise<[TransactionInstruction[][], Keypair[][]]> {
  const signers: Keypair[][] = [];
  const instructions: TransactionInstruction[][] = [];
  if (
    auctionView.auction.data.info.ended() &&
    auctionView.auction.data.info.state !== AuctionState.Ended
  ) {
    await setupPlaceBid(
      connection,
      wallet,
      payingAccount,
      auctionView,
      0,
      instructions,
      signers
    );

    // await sendTransactionWithRetry(
    //   connection,
    //   wallet,
    //   instructions[0],
    //   signers[0],
    // );
  }

  await claimAllBids(
    connection,
    wallet,
    auctionView,
    bidsToClaim,
    signers,
    instructions
  );
  await emptyPaymentAccountForAllTokens(
    connection,
    wallet,
    auctionView,
    signers,
    instructions
  );

  return [instructions, signers];
}

async function emptyPaymentAccountForAllTokens(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: PartialAuctionView,
  currSignerBatch: Keypair[][],
  currInstrBatch: TransactionInstruction[][]
): Promise<[TransactionInstruction[][], Keypair[][]]> {
  if (!wallet.publicKey) throw new Error();

  const PROGRAM_IDS = programIds();
  // const signers: Array<Array<Keypair[]>> = [];
  // const instructions: Array<Array<TransactionInstruction[]>> = [];

  let settleSigners: Keypair[] = [];
  let settleInstructions: TransactionInstruction[] = [];
  const ataLookup: Record<string, boolean> = {};
  // TODO replace all this with payer account so user doesnt need to click approve several times.

  // Overall we have 10 parallel txns, of up to 4 settlements per txn
  // That's what this loop is building.
  const prizeArrays = [
    ...auctionView.items,
    // ...(auctionView.participationItem ? [[auctionView.participationItem]] : []), // dont have participationItem
  ];
  // only one every time
  for (let i = 0; i < prizeArrays.length; i++) {
    const items = prizeArrays[i];

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      const creators = item.metadata.info.data.creators;
      const edgeCaseWhereCreatorIsAuctioneer = !!creators
        ?.map((c) => c.address)
        .find((c) => c === auctionView.auctionManager.data.info.authority);

      const addresses = [
        ...(creators ? creators.map((c) => c.address) : []),
        ...[auctionView.auctionManager.data.info.authority],
      ];

      for (let k = 0; k < addresses.length; k++) {
        const ata = (
          await findProgramAddress(
            [
              toPublicKey(addresses[k]).toBuffer(),
              PROGRAM_IDS.token.toBuffer(),
              QUOTE_MINT.toBuffer(),
            ],
            PROGRAM_IDS.associatedToken
          )
        )[0];

        const existingAta = await connection.getAccountInfo(toPublicKey(ata));
        console.log('Existing ata?', existingAta);
        if (!existingAta && !ataLookup[ata])
          createAssociatedTokenAccountInstruction(
            settleInstructions,
            toPublicKey(ata),
            wallet.publicKey,
            toPublicKey(addresses[k]),
            QUOTE_MINT
          );

        ataLookup[ata] = true;

        const creatorIndex = creators
          ? creators.map((c) => c.address).indexOf(addresses[k])
          : null;

        await emptyPaymentAccount(
          auctionView.auctionManager.data.info.acceptPayment,
          ata,
          auctionView.auctionManager.pubkey,
          item.metadata.pubkey,
          item.masterEdition?.pubkey,
          item.safetyDeposit.pubkey,
          item.safetyDeposit.info.vault,
          auctionView.auction.pubkey,
          wallet.publicKey.toBase58(),
          addresses[k],
          /*item === auctionView.participationItem ? null :*/ i,
          /*item === auctionView.participationItem ? null : */ j,
          creatorIndex === -1 ||
            creatorIndex === null ||
            (edgeCaseWhereCreatorIsAuctioneer && k === addresses.length - 1)
            ? null
            : creatorIndex,
          settleInstructions
        );

        if (settleInstructions.length >= SETTLE_TRANSACTION_SIZE) {
          currSignerBatch.push(settleSigners);
          currInstrBatch.push(settleInstructions);
          settleSigners = [];
          settleInstructions = [];
        }

        // if (currInstrBatch.length === BATCH_SIZE) {
        //   signers.push(currSignerBatch);
        //   instructions.push(currInstrBatch);
        //   currSignerBatch = [];
        //   currInstrBatch = [];
        // }
      }
    }
  }

  if (
    settleInstructions.length < SETTLE_TRANSACTION_SIZE &&
    settleInstructions.length > 0
  ) {
    currSignerBatch.push(settleSigners);
    currInstrBatch.push(settleInstructions);
  }

  // if (currInstrBatch.length <= BATCH_SIZE && currInstrBatch.length > 0) {
  //   // add the last one on
  //   signers.push(currSignerBatch);
  //   instructions.push(currInstrBatch);
  // }

  return [currInstrBatch, currSignerBatch];

  // for (let i = 0; i < instructions.length; i++) {
  //   const instructionBatch = instructions[i];
  //   const signerBatch = signers[i];
  //   if (instructionBatch.length >= 2)
  //     // Pump em through!
  //     await sendTransactions(
  //       connection,
  //       wallet,
  //       instructionBatch,
  //       signerBatch,
  //       SequenceType.StopOnFailure,
  //       'single'
  //     );
  //   else
  //     await sendTransactionWithRetry(
  //       connection,
  //       wallet,
  //       instructionBatch[0],
  //       signerBatch[0],
  //       'single'
  //     );
  // }
}

async function claimAllBids(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: PartialAuctionView,
  bids: ParsedAccount<BidderPot>[],
  currSignerBatch: Keypair[][],
  currInstrBatch: TransactionInstruction[][]
): Promise<[TransactionInstruction[][], Keypair[][]]> {
  // const signers: Array<Array<Keypair[]>> = [];
  // const instructions: Array<Array<TransactionInstruction[]>> = [];

  let claimBidSigners: Keypair[] = []; // every time is [] ?
  let claimBidInstructions: TransactionInstruction[] = [];

  // TODO replace all this with payer account so user doesnt need to click approve several times.

  // Overall we have 10 parallel txns, of up to 7 claims in each txn
  // That's what this loop is building.
  for (let i = 0; i < bids.length; i++) {
    const bid = bids[i];
    console.log('Claiming', bid.info.bidderAct);
    await claimBid(
      auctionView.auctionManager.data.info.acceptPayment,
      bid.info.bidderAct,
      bid.info.bidderPot,
      auctionView.vault.pubkey,
      auctionView.auction.data.info.tokenMint,
      claimBidInstructions
    );

    if (claimBidInstructions.length === CLAIM_TRANSACTION_SIZE) {
      currSignerBatch.push(claimBidSigners);
      currInstrBatch.push(claimBidInstructions);
      claimBidSigners = [];
      claimBidInstructions = [];
    }

    // if (currInstrBatch.length === BATCH_SIZE) {
    //   signers.push(currSignerBatch);
    //   instructions.push(currInstrBatch);
    //   currSignerBatch = [];
    //   currInstrBatch = [];
    // }
  }

  if (
    claimBidInstructions.length < CLAIM_TRANSACTION_SIZE &&
    claimBidInstructions.length > 0
  ) {
    currSignerBatch.push(claimBidSigners);
    currInstrBatch.push(claimBidInstructions);
  }

  // if (currInstrBatch.length <= BATCH_SIZE && currInstrBatch.length > 0) {
  //   // add the last one on
  //   signers.push(currSignerBatch);
  //   instructions.push(currInstrBatch);
  // }

  return [currInstrBatch, currSignerBatch];
  // return;
  // for (let i = 0; i < instructions.length; i++) {
  //   const instructionBatch = instructions[i];
  //   const signerBatch = signers[i];
  //   console.log('Running batch', i);
  //   if (instructionBatch.length >= 2)
  //     // Pump em through!
  //     await sendTransactions(
  //       connection,
  //       wallet,
  //       instructionBatch,
  //       signerBatch,
  //       SequenceType.StopOnFailure,
  //       'single'
  //     );
  //   else
  //     await sendTransactionWithRetry(
  //       connection,
  //       wallet,
  //       instructionBatch[0],
  //       signerBatch[0],
  //       'single'
  //     );
  //   console.log('Done');
  // }
}
