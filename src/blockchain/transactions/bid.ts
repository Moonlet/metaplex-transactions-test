import { AccountLayout, MintInfo } from '@solana/spl-token';
import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  WalletSigner,
  PartialAuctionView,
  ITransactionBuilder,
  TokenAccount,
  ParsedAccount,
  toLamports,
  createTokenAccount,
  toPublicKey,
  setupCancelBid,
  ensureWrappedAccount,
  approve,
  placeBid,
} from '..';
import mintMock from '../../mock/cache/mintMock';
import tokenAccountMock from '../../mock/cache/tokenAccountMock';
import BN from 'bn.js';

export async function setupPlaceBid(
  connection: Connection,
  wallet: WalletSigner,
  bidderTokenAccount: string | undefined,
  auctionView: PartialAuctionView,

  // value entered by the user adjust to decimals of the mint
  // If BN, then assume instant sale and decimals already adjusted.
  amount: number | BN
): Promise<ITransactionBuilder & { bid: BN }> {
  if (!wallet.publicKey) throw new Error();

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];

  const finalInstructions: TransactionInstruction[] = [];
  const finaSigners: Keypair[] = [];

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

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
  if (!auctionView.myBidderPot) {
    const {
      account: tokenAcc,
      instructions: builderInstr,
      signers: builderSigners,
    } = createTokenAccount(
      wallet.publicKey,
      accountRentExempt,
      toPublicKey(auctionView.auction.data.info.tokenMint),
      toPublicKey(auctionView.auction.pubkey)
    );
    instructions.push(...builderInstr);
    signers.push(...builderSigners);
    bidderPotTokenAccount = tokenAcc.toBase58();
  } else {
    bidderPotTokenAccount = auctionView.myBidderPot?.data.info.bidderPot;
    if (!auctionView.auction.data.info.ended()) {
      const { signers: cancelSigners, instructions: cancelInstr } =
        await setupCancelBid(auctionView, accountRentExempt, wallet);
      signers = [...signers, ...cancelSigners];
      instructions = [...cancelInstr, ...instructions];
    }
  }

  const wrappedAccBuilder = ensureWrappedAccount(
    tokenAccount,
    wallet.publicKey,
    lamports + accountRentExempt * 2
  );

  let payingSolAccount;
  if (typeof wrappedAccBuilder !== 'string') {
    instructions.push(...wrappedAccBuilder.instructions);
    cleanupInstructions.push(...wrappedAccBuilder.cleanupInstructions);
    signers.push(...wrappedAccBuilder.signers);
    payingSolAccount = wrappedAccBuilder.account;
  } else {
    payingSolAccount = wrappedAccBuilder;
  }

  const { transferAuthority, instruction, cleanupInstruction } = approve(
    // instructions,
    // cleanupInstructions,
    toPublicKey(payingSolAccount),
    wallet.publicKey,
    lamports - accountRentExempt
  );

  instructions.push(instruction);
  if (cleanupInstruction) {
    cleanupInstructions.push(cleanupInstruction);
  }
  signers.push(transferAuthority);

  const bid = new BN(lamports - accountRentExempt);
  const placeBidInstr = await placeBid(
    wallet.publicKey.toBase58(),
    payingSolAccount,
    bidderPotTokenAccount,
    auctionView.auction.data.info.tokenMint,
    transferAuthority.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    auctionView.auctionManager.data.info.vault,
    bid
  );
  instructions.push(placeBidInstr);

  finaSigners.push(...signers);
  finalInstructions.push(...[...instructions, ...cleanupInstructions]);

  return {
    instructions: finalInstructions,
    signers: finaSigners,
    bid,
  };
}
