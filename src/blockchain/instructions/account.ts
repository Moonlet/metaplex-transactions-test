import {
  AccountInfo as TokenAccountInfo,
  AccountLayout,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  AccountInfo,
  CreateAccountParams,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  IAccountBuilder,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  IEnsureWrappedAccBuilder,
  programIds,
  WRAPPED_SOL_MINT,
  IApproveBuilder,
  IEnsureWrappedAccBuilderV2,
  ITransactionBuilder,
} from '..';

export interface TokenAccount {
  pubkey: string;
  account: AccountInfo<Buffer>;
  info: TokenAccountInfo;
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

export function approve(
  // instructions: TransactionInstruction[],
  // cleanupInstructions: TransactionInstruction[],
  account: PublicKey,
  owner: PublicKey,
  amount: number,
  autoRevoke = true,

  // if delegate is not passed ephemeral transfer authority is used
  delegate?: PublicKey,
  existingTransferAuthority?: Keypair
): IApproveBuilder {
  let instruction: TransactionInstruction;
  let cleanupInstruction: TransactionInstruction | undefined = undefined;

  const tokenProgram = TOKEN_PROGRAM_ID;

  const transferAuthority = existingTransferAuthority || Keypair.generate();
  //const delegateKey = delegate ?? transferAuthority.publicKey;

  instruction = Token.createApproveInstruction(
    tokenProgram,
    account,
    delegate ?? transferAuthority.publicKey,
    owner,
    [],
    amount
  );

  if (autoRevoke) {
    cleanupInstruction = Token.createRevokeInstruction(
      tokenProgram,
      account,
      owner,
      []
    );
  }

  return {
    instruction,
    transferAuthority,
    cleanupInstruction,
  };
}

export const createAccount = (
  params: CreateAccountParams
): TransactionInstruction => {
  return SystemProgram.createAccount({
    ...params,
  });
};
