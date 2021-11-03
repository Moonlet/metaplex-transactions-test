import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import {
  activateVault,
  addTokenToInactiveVault,
  approve,
  // approve,
  AUCTION_PREFIX,
  combineVault,
  createAccount,
  createAuction,
  CreateAuctionArgs,
  // createMint,
  // createTokenAccount,
  ExternalPriceAccount,
  findProgramAddress,
  findValidWhitelistedCreator,
  getAuctionKeys,
  getEdition,
  getExemptionVal,
  getSafetyDepositBox,
  initAuctionManagerV2,
  initVault,
  IPartialCreateAuctionArgs,
  ITransactionBuilder,
  MasterEditionV1,
  MAX_EXTERNAL_ACCOUNT_SIZE,
  MAX_VAULT_SIZE,
  MetadataKey,
  ParsedAccount,
  programIds,
  QUOTE_MINT,
  RentExemp,
  SafetyDepositInstructionTemplate,
  setAuctionAuthority,
  setVaultAuthority,
  startAuction,
  StringPublicKey,
  toPublicKey,
  TupleNumericType,
  updateExternalPriceAccount,
  utils,
  validateSafetyDepositBoxV2,
  VAULT_PREFIX,
  WhitelistedCreator,
  WinningConfigType,
} from '..';
import { createMint, createTokenAccount } from './common';

export async function setupAuctionManagerInstructions(
  publicKey: PublicKey | null,
  vault: StringPublicKey,
  paymentMint: StringPublicKey,
  accountRentExempt: number,
  // safetyDeposit: SafetyDepositInstructionTemplate,
  auctionSettings: IPartialCreateAuctionArgs
): Promise<{
  transaction: ITransactionBuilder;
  auctionManager: StringPublicKey;
}> {
  if (!publicKey) throw new Error();

  const store = programIds().store?.toBase58();
  if (!store) {
    throw new Error('Store not initialized');
  }

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const { auctionManagerKey } = await getAuctionKeys(vault);

  const createTokenBuilder = createTokenAccount(
    publicKey,
    accountRentExempt,
    toPublicKey(paymentMint),
    toPublicKey(auctionManagerKey)
  );
  instructions.push(...createTokenBuilder.transaction.instructions);
  signers.push(...createTokenBuilder.transaction.signers);
  const acceptPayment = createTokenBuilder.account.toBase58();

  let maxRanges = [
    auctionSettings.winners.usize.toNumber(),
    /*safetyDeposit.length */ 0,
    100,
  ].sort()[0];
  if (maxRanges < 10) {
    maxRanges = 10;
  }

  const initAuctionInstr = await initAuctionManagerV2(
    vault,
    publicKey.toBase58(),
    publicKey.toBase58(),
    acceptPayment,
    store,
    TupleNumericType.U8,
    auctionSettings.winners.usize.toNumber() >= 254
      ? TupleNumericType.U16
      : TupleNumericType.U8,
    new BN(maxRanges)
  );
  instructions.push(initAuctionInstr);

  return {
    transaction: { instructions, signers },
    auctionManager: auctionManagerKey,
  };
}

export async function setupStartAuction(
  publicKey: PublicKey | null,
  vault: StringPublicKey
): Promise<ITransactionBuilder> {
  if (!publicKey) throw new Error();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const startAuctionInstr = await startAuction(vault, publicKey.toBase58());
  instructions.push(startAuctionInstr);

  return { instructions, signers };
}

export async function validateBoxes(
  publicKey: PublicKey | null,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  vault: StringPublicKey,
  safetyDeposit: SafetyDepositInstructionTemplate,
  safetyDepositTokenStore: StringPublicKey
): Promise<ITransactionBuilder> {
  if (!publicKey) throw new Error();

  const store = programIds().store?.toBase58();
  if (!store) {
    throw new Error('Store not initialized');
  }

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  let safetyDepositBox: StringPublicKey;

  const me = safetyDeposit.draft
    .masterEdition as ParsedAccount<MasterEditionV1>;
  // todo: always false ?
  if (
    safetyDeposit.config.winningConfigType === WinningConfigType.PrintingV1 &&
    me &&
    me.info.printingMint
  ) {
    safetyDepositBox = await getSafetyDepositBox(
      vault,
      //@ts-ignore
      safetyDeposit[i].draft.masterEdition.info.printingMint
    );
  } else {
    safetyDepositBox = await getSafetyDepositBox(
      vault,
      safetyDeposit.draft.metadata.info.mint
    );
  }
  const edition: StringPublicKey = await getEdition(
    safetyDeposit.draft.metadata.info.mint
  );

  const whitelistedCreator = safetyDeposit.draft.metadata.info.data.creators
    ? await findValidWhitelistedCreator(
        whitelistedCreatorsByCreator,
        //@ts-ignore
        safetyDeposit.draft.metadata.info.data.creators
      )
    : undefined;

  const validateBoxInstr = await validateSafetyDepositBoxV2(
    vault,
    safetyDeposit.draft.metadata.pubkey,
    safetyDepositBox,
    safetyDepositTokenStore,
    safetyDeposit.config.winningConfigType === WinningConfigType.PrintingV1
      ? me?.info.printingMint
      : safetyDeposit.draft.metadata.info.mint,
    publicKey.toBase58(),
    publicKey.toBase58(),
    publicKey.toBase58(),
    edition,
    whitelistedCreator,
    store,
    safetyDeposit.config
  );
  instructions.push(validateBoxInstr);

  return { instructions, signers };
}

export async function setupAuction(
  publicKey: PublicKey | null,
  vault: StringPublicKey,
  auctionSettings: IPartialCreateAuctionArgs
): Promise<{
  transaction: ITransactionBuilder;
  auction: StringPublicKey;
}> {
  if (!publicKey) throw new Error();

  const PROGRAM_IDS = utils.programIds();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];
  const auctionKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(PROGRAM_IDS.auction).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.auction)
    )
  )[0];

  const fullSettings = new CreateAuctionArgs({
    ...auctionSettings,
    authority: publicKey.toBase58(),
    resource: vault,
  });

  const createAuctionInstr = await createAuction(
    fullSettings,
    publicKey.toBase58()
  );
  instructions.push(createAuctionInstr);

  return { transaction: { instructions, signers }, auction: auctionKey };
}

export async function createExternalPriceAccount(
  epaRentExempt: number,
  publicKey: PublicKey | null
): Promise<{
  transaction: ITransactionBuilder;
  priceMint: StringPublicKey;
  externalPriceAccount: StringPublicKey;
}> {
  if (!publicKey) throw new Error();

  const PROGRAM_IDS = utils.programIds();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const externalPriceAccount = Keypair.generate();
  const key = externalPriceAccount.publicKey.toBase58();

  const epaStruct = new ExternalPriceAccount({
    pricePerShare: new BN(0),
    priceMint: QUOTE_MINT.toBase58(),
    allowedToCombine: true,
  });

  const uninitializedEPA = createAccount({
    fromPubkey: publicKey,
    newAccountPubkey: externalPriceAccount.publicKey,
    lamports: epaRentExempt,
    space: MAX_EXTERNAL_ACCOUNT_SIZE,
    programId: toPublicKey(PROGRAM_IDS.vault),
  });

  instructions.push(uninitializedEPA);
  signers.push(externalPriceAccount);

  const updateExPriceAccInstr = updateExternalPriceAccount(key, epaStruct);
  instructions.push(updateExPriceAccInstr);

  return {
    externalPriceAccount: key,
    priceMint: QUOTE_MINT.toBase58(),
    transaction: {
      instructions,
      signers,
    },
  };
}

export async function createVault(
  rentExemption: Map<RentExemp, number>,
  publicKey: PublicKey | null,
  priceMint: StringPublicKey,
  externalPriceAccount: StringPublicKey
): Promise<{
  transaction: ITransactionBuilder;
  vault: StringPublicKey;
  fractionalMint: StringPublicKey;
  redeemTreasury: StringPublicKey;
  fractionTreasury: StringPublicKey;
}> {
  if (!publicKey) throw new Error();

  const PROGRAM_IDS = utils.programIds();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const accountRentExempt = getExemptionVal(
    rentExemption,
    RentExemp.AccountLayout
  );
  const mintRentExempt = getExemptionVal(rentExemption, RentExemp.MintLayout);
  const vaultRentExempt = getExemptionVal(
    rentExemption,
    RentExemp.MaxVaultSize
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

  // create mint
  const createMintTrans = createMint(
    publicKey,
    mintRentExempt,
    0,
    toPublicKey(vaultAuthority),
    toPublicKey(vaultAuthority)
  );
  instructions.push(...createMintTrans.transaction.instructions);
  signers.push(...createMintTrans.transaction.signers);
  const fractionalMint = createMintTrans.account.toBase58();

  // create redeem treasury builder
  const redeemTreasuryBuilder = createTokenAccount(
    publicKey,
    accountRentExempt,
    toPublicKey(priceMint),
    toPublicKey(vaultAuthority)
  );
  instructions.push(...redeemTreasuryBuilder.transaction.instructions);
  signers.push(...redeemTreasuryBuilder.transaction.signers);
  const redeemTreasury = redeemTreasuryBuilder.account.toBase58();

  // create fractional mint builder
  const fractionlMintBuilder = createTokenAccount(
    publicKey,
    accountRentExempt,
    toPublicKey(fractionalMint),
    toPublicKey(vaultAuthority)
  );
  instructions.push(...fractionlMintBuilder.transaction.instructions);
  signers.push(...fractionlMintBuilder.transaction.signers);
  const fractionTreasury = fractionlMintBuilder.account.toBase58();

  const uninitializedVault = createAccount({
    fromPubkey: publicKey,
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
    publicKey.toBase58(),
    externalPriceAccount
  );

  instructions.push(initVaultInstr);

  return {
    transaction: {
      signers,
      instructions,
    },
    vault: vault.publicKey.toBase58(),
    fractionalMint,
    redeemTreasury,
    fractionTreasury,
  };
}

// This command "closes" the vault, by activating & combining it in one go, handing it over to the auction manager
// authority (that may or may not exist yet.)
export async function closeVault(
  accountRentExempt: number,
  publicKey: PublicKey | null,
  vault: StringPublicKey,
  fractionMint: StringPublicKey,
  fractionTreasury: StringPublicKey,
  redeemTreasury: StringPublicKey,
  priceMint: StringPublicKey,
  externalPriceAccount: StringPublicKey
): Promise<ITransactionBuilder> {
  if (!publicKey) throw new Error();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const activateVaultInstr = await activateVault(
    new BN(0),
    vault,
    fractionMint,
    fractionTreasury,
    publicKey.toBase58()
  );
  instructions.push(activateVaultInstr);

  const createTokenFraction = createTokenAccount(
    publicKey,
    accountRentExempt,
    toPublicKey(fractionMint),
    publicKey
  );
  instructions.push(...createTokenFraction.transaction.instructions);
  signers.push(...createTokenFraction.transaction.signers);

  const createTokenMint = createTokenAccount(
    publicKey,
    accountRentExempt,
    toPublicKey(priceMint),
    publicKey
  );
  instructions.push(...createTokenMint.transaction.instructions);
  signers.push(...createTokenMint.transaction.signers);

  const transferAuthority = Keypair.generate();

  // Shouldn't need to pay anything since we activated vault with 0 shares, but we still
  // need this setup anyway.
  const approveMint = approve(
    createTokenMint.account,
    publicKey,
    0,
    false,
    undefined,
    transferAuthority
  );
  instructions.push(approveMint.instruction);

  const approveFraction = approve(
    createTokenFraction.account,
    publicKey,
    0,
    false,
    undefined,
    transferAuthority
  );
  instructions.push(approveFraction.instruction);

  signers.push(transferAuthority);

  const combineVaultInstr = await combineVault(
    vault,
    createTokenFraction.account.toBase58(),
    createTokenMint.account.toBase58(),
    fractionMint,
    fractionTreasury,
    redeemTreasury,
    publicKey.toBase58(),
    publicKey.toBase58(),
    transferAuthority.publicKey.toBase58(),
    externalPriceAccount
  );
  instructions.push(combineVaultInstr);

  return { instructions, signers };
}

export async function setVaultAndAuctionAuthorities(
  publicKey: PublicKey | null,
  vault: StringPublicKey,
  auction: StringPublicKey,
  auctionManager: StringPublicKey
): Promise<ITransactionBuilder> {
  if (!publicKey) throw new Error();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const auctionAuthorityInstr = setAuctionAuthority(
    auction,
    publicKey.toBase58(),
    auctionManager
  );

  instructions.push(auctionAuthorityInstr);

  const vaultAuthInstr = setVaultAuthority(
    vault,
    publicKey.toBase58(),
    auctionManager
  );
  instructions.push(vaultAuthInstr);

  return { instructions, signers };
}

export async function addTokensToVault(
  accountRentExempt: number,
  publicKey: PublicKey | null,
  vault: StringPublicKey,
  nft: SafetyDepositInstructionTemplate
): Promise<{
  transaction: ITransactionBuilder;
  safetyDepositTokenStore: StringPublicKey;
}> {
  if (!publicKey) throw new Error();

  const PROGRAM_IDS = utils.programIds();

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
  let newStore: StringPublicKey | undefined = undefined;

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];
  if (nft.box.tokenAccount) {
    const createToken = createTokenAccount(
      publicKey,
      accountRentExempt,
      toPublicKey(nft.box.tokenMint),
      toPublicKey(vaultAuthority)
    );
    instructions.push(...createToken.transaction.instructions);
    signers.push(...createToken.transaction.signers);
    newStore = createToken.account.toBase58();

    const { instruction, transferAuthority } = approve(
      toPublicKey(nft.box.tokenAccount),
      publicKey,
      nft.box.amount.toNumber()
    );
    instructions.push(instruction);
    signers.push(transferAuthority);

    const addTokenVaultInstr = await addTokenToInactiveVault(
      nft.draft.masterEdition &&
        nft.draft.masterEdition.info.key === MetadataKey.MasterEditionV2
        ? new BN(1)
        : nft.box.amount,
      nft.box.tokenMint,
      nft.box.tokenAccount,
      createToken.account.toBase58(),
      vault,
      publicKey.toBase58(),
      publicKey.toBase58(),
      transferAuthority.publicKey.toBase58()
    );
    instructions.push(addTokenVaultInstr);
  } else {
    throw new Error('token account missing');
  }

  return {
    transaction: { signers, instructions },
    safetyDepositTokenStore: newStore,
  };
}
