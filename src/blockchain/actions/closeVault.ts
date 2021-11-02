import { Keypair, Connection, TransactionInstruction } from '@solana/web3.js';
// import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import {
  StringPublicKey,
  toPublicKey,
  WalletSigner,
  createTokenAccount,
  activateVault,
  approve,
  combineVault,
} from '..';

import { AccountLayout } from '@solana/spl-token';
import BN from 'bn.js';

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
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
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
