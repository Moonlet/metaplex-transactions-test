import { Keypair, Connection, TransactionInstruction } from '@solana/web3.js';
import {
  utils,
  findProgramAddress,
  MetadataKey,
  StringPublicKey,
  toPublicKey,
  WalletSigner,
  SafetyDepositConfig,
  approve,
  createTokenAccount,
  addTokenToInactiveVault,
  VAULT_PREFIX,
} from '..';

import { AccountLayout } from '@solana/spl-token';
import BN from 'bn.js';
import { SafetyDepositDraft } from './createAuctionManager';
// import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

export interface SafetyDepositInstructionTemplate {
  box: {
    tokenAccount?: StringPublicKey;
    tokenMint: StringPublicKey;
    amount: BN;
  };
  draft: SafetyDepositDraft;
  config: SafetyDepositConfig;
}

const BATCH_SIZE = 1;
// This command batches out adding tokens to a vault using a prefilled payer account, and then activates and combines
// the vault for use. It issues a series of transaction instructions and signers for the sendTransactions batch.
export async function addTokensToVault(
  connection: Connection,
  wallet: WalletSigner,
  vault: StringPublicKey,
  nfts: SafetyDepositInstructionTemplate[] // only one every time
): Promise<{
  instructions: Array<TransactionInstruction[]>;
  signers: Array<Keypair[]>;
  safetyDepositTokenStores: StringPublicKey[];
}> {
  if (!wallet.publicKey) throw new Error();

  const PROGRAM_IDS = utils.programIds();

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  const vaultAuthority = (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        toPublicKey(PROGRAM_IDS.vault).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.vault)
    )
  )[0];

  let batchCounter = 0;

  const signers: Array<Keypair[]> = [];
  const instructions: Array<TransactionInstruction[]> = [];
  const newStores: StringPublicKey[] = [];

  let currSigners: Keypair[] = [];
  let currInstructions: TransactionInstruction[] = [];
  for (let i = 0; i < nfts.length; i++) {
    // no need iterate
    const nft = nfts[i];
    if (nft.box.tokenAccount) {
      const newStoreAccount = createTokenAccount(
        currInstructions,
        wallet.publicKey,
        accountRentExempt,
        toPublicKey(nft.box.tokenMint),
        toPublicKey(vaultAuthority),
        currSigners
      );
      newStores.push(newStoreAccount.toBase58());

      const transferAuthority = approve(
        currInstructions,
        [],
        toPublicKey(nft.box.tokenAccount),
        wallet.publicKey,
        nft.box.amount.toNumber()
      );

      currSigners.push(transferAuthority);

      const addTokenVaultInstr = await addTokenToInactiveVault(
        nft.draft.masterEdition &&
          nft.draft.masterEdition.info.key === MetadataKey.MasterEditionV2
          ? new BN(1)
          : nft.box.amount,
        nft.box.tokenMint,
        nft.box.tokenAccount,
        newStoreAccount.toBase58(),
        vault,
        wallet.publicKey.toBase58(),
        wallet.publicKey.toBase58(),
        transferAuthority.publicKey.toBase58()
      );
      currInstructions.push(addTokenVaultInstr);

      if (batchCounter === BATCH_SIZE) {
        signers.push(currSigners);
        instructions.push(currInstructions);
        batchCounter = 0;
        currSigners = [];
        currInstructions = [];
      }
      batchCounter++;
    }
  }

  if (instructions[instructions.length - 1] !== currInstructions) {
    signers.push(currSigners);
    instructions.push(currInstructions);
  }

  return { signers, instructions, safetyDepositTokenStores: newStores };
}

export async function addTokenToVault(
  connection: Connection,
  wallet: WalletSigner,
  vault: StringPublicKey,
  nft: SafetyDepositInstructionTemplate // only one every time
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
  safetyDepositTokenStores: StringPublicKey[];
}> {
  if (!wallet.publicKey) throw new Error();

  const PROGRAM_IDS = utils.programIds();

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  const vaultAuthority = (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        toPublicKey(PROGRAM_IDS.vault).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.vault)
    )
  )[0];

  const newStores: StringPublicKey[] = [];

  let currSigners: Keypair[] = [];
  let currInstructions: TransactionInstruction[] = [];
  if (nft.box.tokenAccount) {
    const newStoreAccount = createTokenAccount(
      currInstructions,
      wallet.publicKey,
      accountRentExempt,
      toPublicKey(nft.box.tokenMint),
      toPublicKey(vaultAuthority),
      currSigners
    );
    newStores.push(newStoreAccount.toBase58());

    const transferAuthority = approve(
      currInstructions,
      [],
      toPublicKey(nft.box.tokenAccount),
      wallet.publicKey,
      nft.box.amount.toNumber()
    );

    currSigners.push(transferAuthority);

    const addTokenVaultInstr = await addTokenToInactiveVault(
      nft.draft.masterEdition &&
        nft.draft.masterEdition.info.key === MetadataKey.MasterEditionV2
        ? new BN(1)
        : nft.box.amount,
      nft.box.tokenMint,
      nft.box.tokenAccount,
      newStoreAccount.toBase58(),
      vault,
      wallet.publicKey.toBase58(),
      wallet.publicKey.toBase58(),
      transferAuthority.publicKey.toBase58()
    );
    currInstructions.push(addTokenVaultInstr);
  }

  return {
    signers: currSigners,
    instructions: currInstructions,
    safetyDepositTokenStores: newStores,
  };
}
