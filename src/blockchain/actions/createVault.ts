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
} from '..';

import { AccountLayout, MintLayout } from '@solana/spl-token';
// import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

// This command creates the external pricing oracle a vault
// This gets the vault ready for adding the tokens.
export async function createVault(
  connection: Connection,
  wallet: WalletSigner,
  priceMint: StringPublicKey,
  externalPriceAccount: StringPublicKey
): Promise<{
  vault: StringPublicKey;
  fractionalMint: StringPublicKey;
  redeemTreasury: StringPublicKey;
  fractionTreasury: StringPublicKey;
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
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
