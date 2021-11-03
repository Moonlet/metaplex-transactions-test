import { AccountLayout, MintLayout, Token } from '@solana/spl-token';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  IEnsureWrappedAccBuilderV2,
  ITransactionBuilder,
  programIds,
  TokenAccount,
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
} from '..';

export function createMint(
  payer: PublicKey,
  mintRentExempt: number,
  decimals: number,
  owner: PublicKey,
  freezeAuthority: PublicKey
): {
  transaction: ITransactionBuilder;
  account: PublicKey;
} {
  const instructions: TransactionInstruction[] = [];
  const signers: Keypair[] = [];

  const account = Keypair.generate();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports: mintRentExempt,
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  instructions.push(
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      account.publicKey,
      decimals,
      owner,
      freezeAuthority
    )
  );
  signers.push(account);

  return {
    transaction: {
      instructions,
      signers,
    },
    account: account.publicKey,
  };
}

export function createTokenAccount(
  payer: PublicKey,
  accountRentExempt: number,
  mint: PublicKey,
  owner: PublicKey
): {
  transaction: ITransactionBuilder;
  account: PublicKey;
} {
  const instructions: TransactionInstruction[] = [];
  const signers: Keypair[] = [];

  const account = Keypair.generate();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports: accountRentExempt,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    })
  );
  instructions.push(
    Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      mint,
      account.publicKey,
      owner
    )
  );

  signers.push(account);

  return {
    transaction: { instructions, signers },
    account: account.publicKey,
  };
}

export function ensureWrappedAccount(
  toCheck: TokenAccount | undefined,
  payer: PublicKey,
  amount: number
): IEnsureWrappedAccBuilderV2 | string {
  if (toCheck && !toCheck.info.isNative) {
    return toCheck.pubkey;
  }

  const instructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];
  const signers: Keypair[] = [];

  const TOKEN_PROGRAM_ID = programIds().token;
  const account = Keypair.generate();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports: amount,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  instructions.push(
    Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      WRAPPED_SOL_MINT,
      account.publicKey,
      payer
    )
  );

  cleanupInstructions.push(
    Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      account.publicKey,
      payer,
      payer,
      []
    )
  );

  signers.push(account);

  return {
    transaction: { instructions, signers },
    cleanupInstructions,
    account: account.publicKey.toBase58(),
  };
}
