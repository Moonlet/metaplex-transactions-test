import { MintInfo } from '@solana/spl-token';
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import {
  approve,
  cancelBid,
  ITransactionBuilder,
  ParsedAccount,
  PartialAuctionView,
  placeBid,
  TokenAccount,
  toLamports,
  toPublicKey,
} from '..';
import mintMock from '../../mock/cache/mintMock';
import tokenAccountMock from '../../mock/cache/tokenAccountMock';
import { createTokenAccount, ensureWrappedAccount } from './common';

export async function setupPlaceBid(
  accountRentExempt: number,
  publicKey: PublicKey | null,
  bidderTokenAccount: string | undefined,
  auctionView: PartialAuctionView,

  // value entered by the user adjust to decimals of the mint
  // If BN, then assume instant sale and decimals already adjusted.
  amount: number | BN
): Promise<{ transaction: ITransactionBuilder; bid: BN }> {
  if (!publicKey) throw new Error();

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];

  // ~~~~~~~GET REAL DATA ~~~~~~~

  // todo: get from our DB: send auctionPubKey + bidderPubKey
  // const tokenAccount =  bidderTokenAccount
  //   ? (cache.get(bidderTokenAccount) as TokenAccount)
  //   : undefined;

  // const mint = cache.get(
  //   tokenAccount ? tokenAccount.info.mint : QUOTE_MINT
  // ) as ParsedAccount<MintInfo>;

  // ~~~~~ REPLACE THIS ~~~~~~
  const tokenAccount = tokenAccountMock as any as TokenAccount;
  const mint = mintMock as any as ParsedAccount<MintInfo>;

  const lamports =
    accountRentExempt +
    (typeof amount === 'number'
      ? toLamports(amount, mint.info)
      : amount.toNumber());

  let bidderPotTokenAccount: string;
  // if I did not have a previous bid
  if (!auctionView.myBidderPot) {
    const createAcc = createTokenAccount(
      publicKey,
      accountRentExempt,
      toPublicKey(auctionView.auction.data.info.tokenMint),
      toPublicKey(auctionView.auction.pubkey)
    );

    instructions.push(...createAcc.transaction.instructions);
    signers.push(...createAcc.transaction.signers);
    bidderPotTokenAccount = createAcc.account.toBase58();
  } else {
    bidderPotTokenAccount = auctionView.myBidderPot?.data.info.bidderPot;
    if (!auctionView.auction.data.info.ended()) {
      const cancelBid = await setupCancelBid(
        auctionView,
        accountRentExempt,
        publicKey
      );

      signers = [...signers, ...cancelBid.signers];
      instructions = [...cancelBid.instructions, ...instructions];
    }
  }

  const wrappedAccBuilder = ensureWrappedAccount(
    tokenAccount,
    publicKey,
    lamports + accountRentExempt * 2
  );

  let payingSolAccount;
  if (typeof wrappedAccBuilder !== 'string') {
    instructions.push(...wrappedAccBuilder.transaction.instructions);
    cleanupInstructions.push(...wrappedAccBuilder.cleanupInstructions);
    signers.push(...wrappedAccBuilder.transaction.signers);
    payingSolAccount = wrappedAccBuilder.account;
  } else {
    payingSolAccount = wrappedAccBuilder;
  }

  const { transferAuthority, instruction, cleanupInstruction } = approve(
    toPublicKey(payingSolAccount),
    publicKey,
    lamports - accountRentExempt
  );
  instructions.push(instruction);
  signers.push(transferAuthority);

  if (cleanupInstruction) {
    cleanupInstructions.push(cleanupInstruction);
  }

  const bid = new BN(lamports - accountRentExempt);
  const placeBidInstr = await placeBid(
    publicKey.toBase58(),
    payingSolAccount,
    bidderPotTokenAccount,
    auctionView.auction.data.info.tokenMint,
    transferAuthority.publicKey.toBase58(),
    publicKey.toBase58(),
    auctionView.auctionManager.data.info.vault,
    bid
  );
  instructions.push(placeBidInstr);

  return {
    transaction: {
      instructions: [...instructions, ...cleanupInstructions],
      signers,
    },
    bid,
  };
}

export async function setupCancelBid(
  auctionView: PartialAuctionView,
  accountRentExempt: number,
  publicKey: PublicKey | null
): Promise<ITransactionBuilder> {
  if (!publicKey) throw new Error();

  const cancelSigners: Keypair[] = [];
  const cancelInstructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];

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
      publicKey,
      accountRentExempt
    );

    let receivingSolAccount;
    if (typeof wrappedAccBuilder !== 'string') {
      cancelInstructions.push(...wrappedAccBuilder.transaction.instructions);
      cleanupInstructions.push(...wrappedAccBuilder.cleanupInstructions);
      cancelSigners.push(...wrappedAccBuilder.transaction.signers);
      receivingSolAccount = wrappedAccBuilder.account;
    } else {
      receivingSolAccount = wrappedAccBuilder;
    }

    const cancelBidInstr = await cancelBid(
      publicKey.toBase58(),
      receivingSolAccount,
      auctionView.myBidderPot.data.info.bidderPot,
      auctionView.auction.data.info.tokenMint,
      auctionView.vault.pubkey
    );
    cancelInstructions.push(cancelBidInstr);
  }
  return {
    instructions: [...cancelInstructions, ...cleanupInstructions],
    signers: cancelSigners,
  };
}
