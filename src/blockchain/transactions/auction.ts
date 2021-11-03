import {
  SystemProgram,
  Keypair,
  TransactionInstruction,
  Connection,
} from '@solana/web3.js';
import {
  WalletSigner,
  SafetyDepositDraft,
  SafetyDepositInstructionTemplate,
  WinningConfigType,
  ParsedAccount,
  MasterEditionV1,
  SafetyDepositConfig,
  TupleNumericType,
  StringPublicKey,
  IPartialCreateAuctionArgs,
  ITransactionBuilder,
  programIds,
  getAuctionKeys,
  createTokenAccount,
  toPublicKey,
  initAuctionManagerV2,
  startAuction,
  WhitelistedCreator,
  Creator,
  getWhitelistedCreator,
  ITransactionBuilderBatch,
  getSafetyDepositBox,
  getEdition,
  validateSafetyDepositBoxV2,
  utils,
  findProgramAddress,
  AUCTION_PREFIX,
  CreateAuctionArgs,
  createAuction,
  MAX_EXTERNAL_ACCOUNT_SIZE,
  ExternalPriceAccount,
  QUOTE_MINT,
  updateExternalPriceAccount,
  activateVault,
  addTokenToInactiveVault,
  approve,
  combineVault,
  createMint,
  initVault,
  MAX_VAULT_SIZE,
  MetadataKey,
  setAuctionAuthority,
  setVaultAuthority,
  VAULT_PREFIX,
} from '..';
import BN from 'bn.js';
import { AccountLayout, MintLayout } from '@solana/spl-token';

export function buildSafetyDepositArray(
  wallet: WalletSigner,
  safetyDeposits: SafetyDepositDraft[]
  // participationSafetyDepositDraft: SafetyDepositDraft | undefined,
): SafetyDepositInstructionTemplate[] {
  if (!wallet.publicKey) throw new Error();

  const safetyDepositTemplates: SafetyDepositInstructionTemplate[] = [];
  safetyDeposits.forEach((s, i) => {
    const maxAmount = [...s.amountRanges.map((a) => a.amount)]
      .sort()
      .reverse()[0];

    const maxLength = [...s.amountRanges.map((a) => a.length)]
      .sort()
      .reverse()[0];
    safetyDepositTemplates.push({
      box: {
        tokenAccount:
          s.winningConfigType !== WinningConfigType.PrintingV1 // every time FullRightsTransfer
            ? s.holding
            : s.printingMintHolding,
        tokenMint:
          s.winningConfigType !== WinningConfigType.PrintingV1 // every time FullRightsTransfer
            ? s.metadata.info.mint
            : (s.masterEdition as ParsedAccount<MasterEditionV1>)?.info
                .printingMint,
        amount:
          s.winningConfigType == WinningConfigType.PrintingV2 ||
          s.winningConfigType == WinningConfigType.FullRightsTransfer
            ? new BN(1) // every time: 1
            : new BN(
                s.amountRanges.reduce(
                  (acc, r) => acc.add(r.amount.mul(r.length)),
                  new BN(0)
                )
              ),
      },
      config: new SafetyDepositConfig({
        directArgs: {
          auctionManager: SystemProgram.programId.toBase58(),
          order: new BN(i),
          amountRanges: s.amountRanges,
          amountType: maxAmount.gte(new BN(254))
            ? TupleNumericType.U16
            : TupleNumericType.U8, // every time
          lengthType: maxLength.gte(new BN(254))
            ? TupleNumericType.U16
            : TupleNumericType.U8, // every time
          winningConfigType: s.winningConfigType,
          participationConfig: null,
          participationState: null,
        },
      }),
      draft: s,
    });
  });

  console.log('Temps', safetyDepositTemplates);
  return safetyDepositTemplates;
}

export async function setupAuctionManagerInstructions(
  wallet: WalletSigner,
  vault: StringPublicKey,
  paymentMint: StringPublicKey,
  accountRentExempt: number,
  safetyDeposits: SafetyDepositInstructionTemplate[],
  auctionSettings: IPartialCreateAuctionArgs
): Promise<{
  transaction: ITransactionBuilder;
  auctionManager: StringPublicKey;
}> {
  if (!wallet.publicKey) throw new Error();

  const store = programIds().store?.toBase58();
  if (!store) {
    throw new Error('Store not initialized');
  }

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const { auctionManagerKey } = await getAuctionKeys(vault);

  const createTokenBuilder = createTokenAccount(
    wallet.publicKey,
    accountRentExempt,
    toPublicKey(paymentMint),
    toPublicKey(auctionManagerKey)
  );
  instructions.push(...createTokenBuilder.instructions);
  signers.push(...createTokenBuilder.signers);
  const acceptPayment = createTokenBuilder.account.toBase58();

  let maxRanges = [
    auctionSettings.winners.usize.toNumber(),
    safetyDeposits.length,
    100,
  ].sort()[0];
  if (maxRanges < 10) {
    maxRanges = 10;
  }

  const initAuctionInstr = await initAuctionManagerV2(
    vault,
    wallet.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    acceptPayment,
    store,
    safetyDeposits.length >= 254 ? TupleNumericType.U16 : TupleNumericType.U8, // fiex U8
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
  wallet: WalletSigner,
  vault: StringPublicKey
): Promise<ITransactionBuilder> {
  if (!wallet.publicKey) throw new Error();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const startAuctionInstr = await startAuction(
    vault,
    wallet.publicKey.toBase58()
  );
  instructions.push(startAuctionInstr);

  return { instructions, signers };
}

async function findValidWhitelistedCreator(
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  creators: Creator[]
): Promise<StringPublicKey> {
  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i];

    if (whitelistedCreatorsByCreator[creator.address]?.info.activated)
      return whitelistedCreatorsByCreator[creator.address].pubkey;
  }
  return await getWhitelistedCreator(creators[0]?.address);
}

export async function validateBoxes(
  wallet: WalletSigner,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  vault: StringPublicKey,
  safetyDeposit: SafetyDepositInstructionTemplate,
  safetyDepositTokenStore: StringPublicKey
): Promise<ITransactionBuilder> {
  if (!wallet.publicKey) throw new Error();

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
    wallet.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    edition,
    whitelistedCreator,
    store,
    safetyDeposit.config
  );
  instructions.push(validateBoxInstr);

  return { instructions, signers };
}

export async function makeAuction(
  wallet: WalletSigner,
  vault: StringPublicKey,
  auctionSettings: IPartialCreateAuctionArgs
): Promise<{
  transaction: ITransactionBuilder;
  auction: StringPublicKey;
}> {
  if (!wallet.publicKey) throw new Error();

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
    authority: wallet.publicKey.toBase58(),
    resource: vault,
  });

  const createAuctionInstr = await createAuction(
    fullSettings,
    wallet.publicKey.toBase58()
  );
  instructions.push(createAuctionInstr);

  return { transaction: { instructions, signers }, auction: auctionKey };
}

export async function createExternalPriceAccount(
  connection: Connection,
  wallet: WalletSigner
): Promise<{
  transaction: ITransactionBuilder;
  priceMint: StringPublicKey;
  externalPriceAccount: StringPublicKey;
}> {
  if (!wallet.publicKey) throw new Error();

  const PROGRAM_IDS = utils.programIds();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const epaRentExempt = await connection.getMinimumBalanceForRentExemption(
    MAX_EXTERNAL_ACCOUNT_SIZE
  );

  const externalPriceAccount = Keypair.generate();
  const key = externalPriceAccount.publicKey.toBase58();

  const epaStruct = new ExternalPriceAccount({
    pricePerShare: new BN(0),
    priceMint: QUOTE_MINT.toBase58(),
    allowedToCombine: true,
  });

  const uninitializedEPA = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
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

// return Transaction
export async function createVault(
  connection: Connection,
  wallet: WalletSigner, // replace with pubKey
  priceMint: StringPublicKey,
  externalPriceAccount: StringPublicKey
): Promise<{
  transaction: ITransactionBuilder;
  vault: StringPublicKey;
  fractionalMint: StringPublicKey;
  redeemTreasury: StringPublicKey;
  fractionTreasury: StringPublicKey;
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

export async function setVaultAndAuctionAuthorities(
  wallet: WalletSigner,
  vault: StringPublicKey,
  auction: StringPublicKey,
  auctionManager: StringPublicKey
): Promise<ITransactionBuilder> {
  if (!wallet.publicKey) throw new Error();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const auctionAuthorityInstr = setAuctionAuthority(
    auction,
    wallet.publicKey.toBase58(),
    auctionManager
  );

  instructions.push(auctionAuthorityInstr);

  const vaultAuthInstr = setVaultAuthority(
    vault,
    wallet.publicKey.toBase58(),
    auctionManager
  );
  instructions.push(vaultAuthInstr);

  return { instructions, signers };
}

const BATCH_SIZE = 1;
export async function addTokensToVault(
  connection: Connection,
  wallet: WalletSigner,
  vault: StringPublicKey,
  nft: SafetyDepositInstructionTemplate // only one every time
): Promise<{
  transaction: ITransactionBuilder;
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

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];
  if (nft.box.tokenAccount) {
    const {
      account: newStoreAccount,
      instructions: createAccInstr,
      signers: createAccSigners,
    } = createTokenAccount(
      wallet.publicKey,
      accountRentExempt,
      toPublicKey(nft.box.tokenMint),
      toPublicKey(vaultAuthority)
    );
    instructions.push(...createAccInstr);
    signers.push(...createAccSigners);
    newStores.push(newStoreAccount.toBase58());

    const { instruction, transferAuthority } = approve(
      toPublicKey(nft.box.tokenAccount),
      wallet.publicKey,
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
      newStoreAccount.toBase58(),
      vault,
      wallet.publicKey.toBase58(),
      wallet.publicKey.toBase58(),
      transferAuthority.publicKey.toBase58()
    );
    instructions.push(addTokenVaultInstr);
  }

  return {
    transaction: { signers, instructions },
    safetyDepositTokenStores: newStores,
  };
}
