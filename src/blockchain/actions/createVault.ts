import {
  Keypair,
  Connection,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  utils,
  createMint,
  findProgramAddress,
  StringPublicKey,
  toPublicKey,
  WalletSigner,
  initVault,
  MAX_VAULT_SIZE,
  VAULT_PREFIX,
  createTokenAccount,
  ITransactionBuilder,
  activateVault,
  approve,
  combineVault,
} from '..';
import BN from 'bn.js';

import { AccountLayout, MintLayout } from '@solana/spl-token';
// import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

// This command creates the external pricing oracle a vault
// This gets the vault ready for adding the tokens.
export async function createVault(
  connection: Connection,
  wallet: WalletSigner,
  priceMint: StringPublicKey,
  externalPriceAccount: StringPublicKey
): Promise<
  ITransactionBuilder & {
    vault: StringPublicKey;
    fractionalMint: StringPublicKey;
    redeemTreasury: StringPublicKey;
    fractionTreasury: StringPublicKey;
  }
> {
  if (!wallet.publicKey) throw new Error();

  const PROGRAM_IDS = utils.programIds();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  const mintRentExempt = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span
  );

  const vaultRentExempt = await connection.getMinimumBalanceForRentExemption(
    MAX_VAULT_SIZE
  );

  const vault = Keypair.generate();

  const vaultAuthority = // todo same here
  (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        toPublicKey(PROGRAM_IDS.vault).toBuffer(),
        vault.publicKey.toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.vault)
    )
  )[0];

  const createMintTrans = createMint(
    wallet.publicKey,
    mintRentExempt,
    0,
    toPublicKey(vaultAuthority),
    toPublicKey(vaultAuthority)
  );
  instructions.push(...createMintTrans.instructions);
  signers.push(...createMintTrans.signers);
  const fractionalMint = createMintTrans.account.toBase58();

  const redeemTreasuryBuilder = createTokenAccount(
    wallet.publicKey,
    accountRentExempt,
    toPublicKey(priceMint),
    toPublicKey(vaultAuthority)
  );
  instructions.push(...redeemTreasuryBuilder.instructions);
  signers.push(...redeemTreasuryBuilder.signers);
  const redeemTreasury = redeemTreasuryBuilder.account.toBase58();

  const fractionTreasuryBuilder = createTokenAccount(
    wallet.publicKey,
    accountRentExempt,
    toPublicKey(fractionalMint),
    toPublicKey(vaultAuthority)
  );
  instructions.push(...fractionTreasuryBuilder.instructions);
  signers.push(...fractionTreasuryBuilder.signers);
  const fractionTreasury = fractionTreasuryBuilder.account.toBase58();

  const uninitializedVault = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: vault.publicKey,
    lamports: vaultRentExempt,
    space: MAX_VAULT_SIZE,
    programId: toPublicKey(PROGRAM_IDS.vault),
  });
  instructions.push(uninitializedVault);
  signers.push(vault);

  const initVaultInstr = initVault(
    true,
    fractionalMint,
    redeemTreasury,
    fractionTreasury,
    vault.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    externalPriceAccount
  );

  instructions.push(initVaultInstr);

  return {
    vault: vault.publicKey.toBase58(),
    fractionalMint,
    redeemTreasury,
    fractionTreasury,
    signers,
    instructions,
  };
}

// This command "closes" the vault, by activating & combining it in one go, handing it over to the auction manager
// authority (that may or may not exist yet.)
export async function closeVault(
  connection: Connection,
  wallet: WalletSigner,
  vault: StringPublicKey,
  fractionMint: StringPublicKey,
  fractionTreasury: StringPublicKey,
  redeemTreasury: StringPublicKey,
  priceMint: StringPublicKey,
  externalPriceAccount: StringPublicKey
): Promise<ITransactionBuilder> {
  if (!wallet.publicKey) throw new Error();

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );
  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const activateVaultInstr = await activateVault(
    new BN(0),
    vault,
    fractionMint,
    fractionTreasury,
    wallet.publicKey.toBase58()
  );
  instructions.push(activateVaultInstr);

  const {
    account: outstandingShareAccount,
    instructions: shareAccInst,
    signers: shareAccSigners,
  } = createTokenAccount(
    wallet.publicKey,
    accountRentExempt,
    toPublicKey(fractionMint),
    wallet.publicKey
  );
  instructions.push(...shareAccInst);
  signers.push(...shareAccSigners);

  const {
    account: payingTokenAccount,
    instructions: createAccInst,
    signers: createAccSigners,
  } = createTokenAccount(
    wallet.publicKey,
    accountRentExempt,
    toPublicKey(priceMint),
    wallet.publicKey
  );
  instructions.push(...createAccInst);
  signers.push(...createAccSigners);

  const transferAuthority = Keypair.generate();

  // Shouldn't need to pay anything since we activated vault with 0 shares, but we still
  // need this setup anyway.
  const { instruction } = approve(
    // instructions,
    // [],
    payingTokenAccount,
    wallet.publicKey,
    0,
    false,
    undefined,
    transferAuthority
  );
  instructions.push(instruction);

  const { instruction: approveInstr } = approve(
    // instructions,
    // [],
    outstandingShareAccount,
    wallet.publicKey,
    0,
    false,
    undefined,
    transferAuthority
  );
  instructions.push(approveInstr);

  signers.push(transferAuthority);

  const combineVaultInstr = await combineVault(
    vault,
    outstandingShareAccount.toBase58(),
    payingTokenAccount.toBase58(),
    fractionMint,
    fractionTreasury,
    redeemTreasury,
    wallet.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    transferAuthority.publicKey.toBase58(),
    externalPriceAccount
  );
  instructions.push(combineVaultInstr);

  return { instructions, signers };
}
