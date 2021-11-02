import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  AuctionState,
  BidderPot,
  claimBid,
  createAssociatedTokenAccountInstruction,
  emptyPaymentAccount,
  findProgramAddress,
  ITransactionBuilderBatch,
  ParsedAccount,
  PartialAuctionView,
  programIds,
  QUOTE_MINT,
  toPublicKey,
  WalletSigner,
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
): Promise<ITransactionBuilderBatch> {
  const signers: Keypair[][] = [];
  const instructions: TransactionInstruction[][] = [];
  if (
    auctionView.auction.data.info.ended() &&
    auctionView.auction.data.info.state !== AuctionState.Ended
  ) {
    const { instructions: placeBidInstr, signers: placeBidSigners } =
      await setupPlaceBid(connection, wallet, payingAccount, auctionView, 0);
    instructions.push(placeBidInstr);
    signers.push(placeBidSigners);

    // await sendTransactionWithRetry(
    //   connection,
    //   wallet,
    //   instructions[0],
    //   signers[0],
    // );
  }

  // claim instructions
  const { instructions: claimInstr, signers: claimSigners } =
    await claimAllBids(connection, wallet, auctionView, bidsToClaim);

  instructions.push(...claimInstr);
  signers.push(...claimSigners);

  // empty payment accounts
  const { instructions: emptyPaymentInstr, signers: emptyPaymentSigners } =
    await emptyPaymentAccountForAllTokens(connection, wallet, auctionView);

  instructions.push(...emptyPaymentInstr);
  signers.push(...emptyPaymentSigners);

  return { instructions, signers };
}

async function emptyPaymentAccountForAllTokens(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: PartialAuctionView
): Promise<ITransactionBuilderBatch> {
  if (!wallet.publicKey) throw new Error();

  const PROGRAM_IDS = programIds();
  // const signers: Array<Array<Keypair[]>> = [];
  // const instructions: Array<Array<TransactionInstruction[]>> = [];

  const currSignerBatch: Keypair[][] = [];
  const currInstrBatch: TransactionInstruction[][] = [];

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
        if (!existingAta && !ataLookup[ata]) {
          const createTokenInstr = createAssociatedTokenAccountInstruction(
            toPublicKey(ata),
            wallet.publicKey,
            toPublicKey(addresses[k]),
            QUOTE_MINT
          );
          settleInstructions.push(createTokenInstr);
        }

        ataLookup[ata] = true;

        const creatorIndex = creators
          ? creators.map((c) => c.address).indexOf(addresses[k])
          : null;

        const emptyPayTrans = await emptyPaymentAccount(
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
            : creatorIndex
        );
        settleInstructions.push(emptyPayTrans);

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

  return { instructions: currInstrBatch, signers: currSignerBatch };
}

async function claimAllBids(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: PartialAuctionView,
  bids: ParsedAccount<BidderPot>[]
): Promise<ITransactionBuilderBatch> {
  // const signers: Array<Array<Keypair[]>> = [];
  // const instructions: Array<Array<TransactionInstruction[]>> = [];

  const currSignerBatch: Keypair[][] = [];
  const currInstrBatch: TransactionInstruction[][] = [];

  let claimBidSigners: Keypair[] = []; // every time is [] ?
  let claimBidInstructions: TransactionInstruction[] = [];

  // TODO replace all this with payer account so user doesnt need to click approve several times.

  // Overall we have 10 parallel txns, of up to 7 claims in each txn
  // That's what this loop is building.
  for (let i = 0; i < bids.length; i++) {
    const bid = bids[i];
    console.log('Claiming', bid.info.bidderAct);
    const clainBidInstr = await claimBid(
      auctionView.auctionManager.data.info.acceptPayment,
      bid.info.bidderAct,
      bid.info.bidderPot,
      auctionView.vault.pubkey,
      auctionView.auction.data.info.tokenMint
    );

    claimBidInstructions.push(clainBidInstr);

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

  return { instructions: currInstrBatch, signers: currSignerBatch };
}
