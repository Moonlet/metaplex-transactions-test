import { AccountLayout, MintLayout, Token } from '@solana/spl-token';
import {
  AccountInfo,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { AccountInfo as TokenAccountInfo } from '@solana/spl-token';
import {
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
} from '../../utils/ids';
import { programIds } from '../../utils/programIds';
import { IAccountBuilder } from '../..';

export interface TokenAccount {
  pubkey: string;
  account: AccountInfo<Buffer>;
  info: TokenAccountInfo;
}

// todo: could combine with createUninitializedAccount
export function createUninitializedMint(
  payer: PublicKey,
  amount: number
): IAccountBuilder {
  const instructions: TransactionInstruction[] = [];
  const signers: Keypair[] = [];

  const account = Keypair.generate();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports: amount,
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  signers.push(account);

  return {
    instructions,
    signers,
    account: account.publicKey,
  };
}

export function createUninitializedAccount(
  payer: PublicKey,
  amount: number
): IAccountBuilder {
  const instructions: TransactionInstruction[] = [];
  const signers: Keypair[] = [];

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

  signers.push(account);

  return {
    instructions,
    signers,
    account: account.publicKey,
  };
}

export function createAssociatedTokenAccountInstruction(
  associatedTokenAddress: PublicKey,
  payer: PublicKey,
  walletAddress: PublicKey,
  splTokenMintAddress: PublicKey
): TransactionInstruction {
  const keys = [
    {
      pubkey: payer,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: walletAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: splTokenMintAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    data: Buffer.from([]),
  });
}

export function createMint(
  payer: PublicKey,
  mintRentExempt: number,
  decimals: number,
  owner: PublicKey,
  freezeAuthority: PublicKey
): IAccountBuilder {
  const accountBuilder: IAccountBuilder = createUninitializedMint(
    payer,
    mintRentExempt
  );

  accountBuilder.instructions.push(
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      accountBuilder.account,
      decimals,
      owner,
      freezeAuthority
    )
  );

  return accountBuilder;
}

export function createTokenAccount(
  instructions: TransactionInstruction[],
  payer: PublicKey,
  accountRentExempt: number,
  mint: PublicKey,
  owner: PublicKey,
  signers: Keypair[]
) {
  const accBuilder = createUninitializedAccount(payer, accountRentExempt);
  // todo: partial, replace
  instructions.push(...accBuilder.instructions);
  signers.push(...accBuilder.signers);

  instructions.push(
    Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      mint,
      accBuilder.account,
      owner
    )
  );

  return accBuilder.account; //todo: return accBuilder
}

export function ensureWrappedAccount(
  instructions: TransactionInstruction[],
  cleanupInstructions: TransactionInstruction[],
  toCheck: TokenAccount | undefined,
  payer: PublicKey,
  amount: number,
  signers: Keypair[]
) {
  if (toCheck && !toCheck.info.isNative) {
    return toCheck.pubkey;
  }

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

  return account.publicKey.toBase58();
}

export function approve(
  instructions: TransactionInstruction[],
  cleanupInstructions: TransactionInstruction[],
  account: PublicKey,
  owner: PublicKey,
  amount: number,
  autoRevoke = true,

  // if delegate is not passed ephemeral transfer authority is used
  delegate?: PublicKey,
  existingTransferAuthority?: Keypair
): Keypair {
  const tokenProgram = TOKEN_PROGRAM_ID;

  const transferAuthority = existingTransferAuthority || Keypair.generate();
  //const delegateKey = delegate ?? transferAuthority.publicKey;

  instructions.push(
    Token.createApproveInstruction(
      tokenProgram,
      account,
      delegate ?? transferAuthority.publicKey,
      owner,
      [],
      amount
    )
  );

  if (autoRevoke) {
    cleanupInstructions.push(
      Token.createRevokeInstruction(tokenProgram, account, owner, [])
    );
  }

  return transferAuthority;
}
