// import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { AccountLayout } from '@solana/spl-token';
import {
  Connection,
  Keypair,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  AmountRange,
  createTokenAccount,
  Creator,
  Edition,
  getAuctionKeys,
  getEdition,
  getSafetyDepositBox,
  getWhitelistedCreator,
  ICreateAuctionManager,
  initAuctionManagerV2,
  IPartialCreateAuctionArgs,
  ITransactionBuilder,
  ITransactionBuilderBatch,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  ParsedAccount,
  ParticipationConfigV2,
  programIds,
  QUOTE_MINT,
  SafetyDepositConfig,
  sendTransactions,
  sendTransactionWithRetry,
  SequenceType,
  startAuction,
  StringPublicKey,
  toPublicKey,
  TupleNumericType,
  validateSafetyDepositBoxV2,
  WalletSigner,
  WhitelistedCreator,
  WinningConfigType,
} from '..';
import {
  addTokensToVault,
  SafetyDepositInstructionTemplate,
} from './addTokensToVault';
import { closeVault } from './closeVault';
import { createExternalPriceAccount } from './createExternalPriceAccount';
import { createVault } from './createVault';
import { makeAuction } from './makeAuction';
import { setVaultAndAuctionAuthorities } from './setVaultAndAuctionAuthorities';
// import { cacheAuctionIndexer } from './cacheAuctionInIndexer';

interface normalPattern {
  instructions: TransactionInstruction[];
  signers: Keypair[];
}

interface arrayPattern {
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}

export type CreateAuctionData = {
  vault: StringPublicKey;
  auction: StringPublicKey;
  auctionManager: StringPublicKey;
};

interface byType {
  // markItemsThatArentMineAsSold: arrayPattern;
  addTokens: arrayPattern;
  // deprecatedCreateReservationList: arrayPattern;
  validateBoxes: arrayPattern;
  createVault: normalPattern;
  closeVault: normalPattern;
  makeAuction: normalPattern;
  initAuctionManager: normalPattern;
  startAuction: normalPattern;
  setVaultAndAuctionAuthorities: normalPattern;
  externalPriceAccount: normalPattern;
  // deprecatedValidateParticipation?: normalPattern;
  // deprecatedBuildAndPopulateOneTimeAuthorizationAccount?: normalPattern;
  // deprecatedPopulatePrintingTokens?: arrayPattern;
  // cacheAuctionIndexer: arrayPattern;
}

export interface SafetyDepositDraft {
  metadata: ParsedAccount<Metadata>;
  masterEdition?: ParsedAccount<MasterEditionV1 | MasterEditionV2>;
  edition?: ParsedAccount<Edition>;
  holding: StringPublicKey;
  printingMintHolding?: StringPublicKey;
  winningConfigType: WinningConfigType;
  amountRanges: AmountRange[];
  participationConfig?: ParticipationConfigV2;
}

// This is a super command that executes many transactions to create a Vault, Auction, and AuctionManager starting
// from some AuctionManagerSettings.
export async function createAuctionManager(
  connection: Connection,
  wallet: WalletSigner,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  auctionSettings: IPartialCreateAuctionArgs,
  safetyDepositDrafts: SafetyDepositDraft[]
  // participationSafetyDepositDraft: SafetyDepositDraft | undefined,
  // paymentMint: StringPublicKey,
  // storeIndexer: ParsedAccount<StoreIndexer>[],
): Promise<ICreateAuctionManager> {
  const paymentMint: StringPublicKey = QUOTE_MINT.toBase58();
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  const {
    externalPriceAccount,
    priceMint,
    instructions: epaInstructions,
    signers: epaSigners,
  } = await createExternalPriceAccount(connection, wallet);

  const {
    instructions: createVaultInstructions,
    signers: createVaultSigners,
    vault,
    fractionalMint,
    redeemTreasury,
    fractionTreasury,
  } = await createVault(connection, wallet, priceMint, externalPriceAccount);

  const {
    instructions: makeAuctionInstructions,
    signers: makeAuctionSigners,
    auction,
  } = await makeAuction(wallet, vault, auctionSettings);

  const safetyDepositConfigs = await buildSafetyDepositArray(
    wallet,
    safetyDepositDrafts
    // participationSafetyDepositDraft,
  );

  //setup auction manager
  const {
    instructions: auctionManagerInstructions,
    signers: auctionManagerSigners,
    auctionManager,
  } = await setupAuctionManagerInstructions(
    wallet,
    vault,
    paymentMint,
    accountRentExempt,
    safetyDepositConfigs,
    auctionSettings
  );

  // add tokens to vault
  const {
    instructions: addTokenInstructions,
    signers: addTokenSigners,
    safetyDepositTokenStores,
  } = await addTokensToVault(connection, wallet, vault, safetyDepositConfigs);

  //close vault
  const { instructions: closeVaultInstruction, signers: closeVaultSigners } =
    await closeVault(
      connection,
      wallet,
      vault,
      fractionalMint,
      fractionTreasury,
      redeemTreasury,
      priceMint,
      externalPriceAccount
    );

  // set vault and auction authority
  const {
    instructions: vaultAuthorityInstruction,
    signers: vaultAuthoritySigners,
  } = await setVaultAndAuctionAuthorities(
    wallet,
    vault,
    auction,
    auctionManager
  );

  //start auction
  const {
    instructions: startAuctionInstruction,
    signers: startAuctionSigners,
  } = await setupStartAuction(wallet, vault);

  // validate boxes
  const {
    instructions: validateBoxesInstruction,
    signers: validateBoxesSigners,
  } = await validateBoxes(
    wallet,
    whitelistedCreatorsByCreator,
    vault,
    safetyDepositConfigs,
    safetyDepositTokenStores
  );

  const lookup: byType = {
    externalPriceAccount: {
      instructions: epaInstructions,
      signers: epaSigners,
    },
    createVault: {
      instructions: createVaultInstructions,
      signers: createVaultSigners,
    },
    closeVault: {
      instructions: closeVaultInstruction,
      signers: closeVaultSigners,
    },
    addTokens: {
      instructions: addTokenInstructions,
      signers: addTokenSigners,
    },
    makeAuction: {
      instructions: makeAuctionInstructions,
      signers: makeAuctionSigners,
    },
    initAuctionManager: {
      instructions: auctionManagerInstructions,
      signers: auctionManagerSigners,
    },
    setVaultAndAuctionAuthorities: {
      instructions: vaultAuthorityInstruction,
      signers: vaultAuthoritySigners,
    },
    startAuction: {
      instructions: startAuctionInstruction,
      signers: startAuctionSigners,
    },
    validateBoxes: {
      instructions: validateBoxesInstruction,
      signers: validateBoxesSigners,
    },

    //~~~~~~ todo: maybe should not delete cacheAuctionIndexer ~~~~~~

    // cacheAuctionIndexer: await cacheAuctionIndexer(
    //   wallet,
    //   vault,
    //   auction,
    //   auctionManager,
    //   safetyDepositConfigs.map(s => s.draft.metadata.info.mint),
    //   storeIndexer,
    // ),
  };

  const signers: Keypair[][] = [
    lookup.externalPriceAccount.signers,
    lookup.createVault.signers,
    ...lookup.addTokens.signers,
    lookup.closeVault.signers,
    lookup.makeAuction.signers,
    lookup.initAuctionManager.signers,
    lookup.setVaultAndAuctionAuthorities.signers,
    ...lookup.validateBoxes.signers,
    lookup.startAuction.signers,
  ];

  const toRemoveSigners: Record<number, boolean> = {};
  let instructions: TransactionInstruction[][] = [
    lookup.externalPriceAccount.instructions,
    lookup.createVault.instructions,
    ...lookup.addTokens.instructions,
    lookup.closeVault.instructions,
    lookup.makeAuction.instructions,
    lookup.initAuctionManager.instructions,
    lookup.setVaultAndAuctionAuthorities.instructions,
    ...lookup.validateBoxes.instructions,
    lookup.startAuction.instructions,
  ].filter((instr, i) => {
    if (instr.length > 0) {
      return true;
    } else {
      toRemoveSigners[i] = true;
      return false;
    }
  });

  let filteredSigners = signers.filter((_, i) => !toRemoveSigners[i]);

  return {
    instructions,
    signers: filteredSigners,
    vault,
    auction,
    auctionManager,
  };

  let stopPoint = 0;
  let tries = 0;
  let lastInstructionsLength: number | null = null;
  while (stopPoint < instructions.length && tries < 3) {
    instructions = instructions.slice(stopPoint, instructions.length);
    filteredSigners = filteredSigners.slice(stopPoint, filteredSigners.length);

    if (instructions.length === lastInstructionsLength) tries = tries + 1;
    else tries = 0;

    try {
      if (instructions.length === 1) {
        await sendTransactionWithRetry(
          connection,
          wallet,
          instructions[0],
          filteredSigners[0],
          'single'
        );
        stopPoint = 1;
      } else {
        stopPoint = await sendTransactions(
          connection,
          wallet,
          instructions,
          filteredSigners,
          SequenceType.StopOnFailure,
          'single'
        );
      }
    } catch (e) {
      console.error(e);
    }
    console.log(
      'Died on ',
      stopPoint,
      'retrying from instruction',
      instructions[stopPoint],
      'instructions length is',
      instructions.length
    );
    lastInstructionsLength = instructions.length;
  }

  if (stopPoint < instructions.length) throw new Error('Failed to create');
  // return { vault, auction, auctionManager };
}

async function buildSafetyDepositArray(
  wallet: WalletSigner,
  safetyDeposits: SafetyDepositDraft[]
  // participationSafetyDepositDraft: SafetyDepositDraft | undefined,
): Promise<SafetyDepositInstructionTemplate[]> {
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

  // if (
  // participationSafetyDepositDraft &&
  // participationSafetyDepositDraft.masterEdition
  // ) {
  //   const maxAmount = [
  //     ...participationSafetyDepositDraft.amountRanges.map(s => s.amount),
  //   ]
  //     .sort()
  //     .reverse()[0];
  //   const maxLength = [
  //     ...participationSafetyDepositDraft.amountRanges.map(s => s.length),
  //   ]
  //     .sort()
  //     .reverse()[0];
  //   const config = new SafetyDepositConfig({
  //     directArgs: {
  //       auctionManager: SystemProgram.programId.toBase58(),
  //       order: new BN(safetyDeposits.length),
  //       amountRanges: participationSafetyDepositDraft.amountRanges,
  //       amountType: maxAmount?.gte(new BN(255))
  //         ? TupleNumericType.U32
  //         : TupleNumericType.U8,
  //       lengthType: maxLength?.gte(new BN(255))
  //         ? TupleNumericType.U32
  //         : TupleNumericType.U8,
  //       winningConfigType: WinningConfigType.Participation,
  //       participationConfig:
  //         participationSafetyDepositDraft.participationConfig || null,
  //       participationState: new ParticipationStateV2({
  //         collectedToAcceptPayment: new BN(0),
  //       }),
  //     },
  //   });

  //   if (
  //     participationSafetyDepositDraft.masterEdition.info.key ==
  //     MetadataKey.MasterEditionV1
  //   ) {
  //     const me =
  //       participationSafetyDepositDraft.masterEdition as ParsedAccount<MasterEditionV1>;
  //     safetyDepositTemplates.push({
  //       box: {
  //         tokenAccount: (
  //           await findProgramAddress(
  //             [
  //               wallet.publicKey.toBuffer(),
  //               programIds().token.toBuffer(),
  //               toPublicKey(
  //                 me?.info.oneTimePrintingAuthorizationMint,
  //               ).toBuffer(),
  //             ],
  //             programIds().associatedToken,
  //           )
  //         )[0],
  //         tokenMint: me?.info.oneTimePrintingAuthorizationMint,
  //         amount: new BN(1),
  //       },
  //       config,
  //       draft: participationSafetyDepositDraft,
  //     });
  //   } else {
  //     safetyDepositTemplates.push({
  //       box: {
  //         tokenAccount: participationSafetyDepositDraft.holding,
  //         tokenMint: participationSafetyDepositDraft.metadata.info.mint,
  //         amount: new BN(1),
  //       },
  //       config,
  //       draft: participationSafetyDepositDraft,
  //     });
  //   }
  // }
  console.log('Temps', safetyDepositTemplates);
  return safetyDepositTemplates;
}

async function setupAuctionManagerInstructions(
  wallet: WalletSigner,
  vault: StringPublicKey,
  paymentMint: StringPublicKey,
  accountRentExempt: number,
  safetyDeposits: SafetyDepositInstructionTemplate[],
  auctionSettings: IPartialCreateAuctionArgs
): Promise<
  ITransactionBuilder & {
    auctionManager: StringPublicKey;
  }
> {
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

  return { instructions, signers, auctionManager: auctionManagerKey };
}

async function setupStartAuction(
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

async function validateBoxes(
  wallet: WalletSigner,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  vault: StringPublicKey,
  safetyDeposits: SafetyDepositInstructionTemplate[],
  safetyDepositTokenStores: StringPublicKey[]
): Promise<ITransactionBuilderBatch> {
  if (!wallet.publicKey) throw new Error();

  const store = programIds().store?.toBase58();
  if (!store) {
    throw new Error('Store not initialized');
  }
  const signers: Keypair[][] = [];
  const instructions: TransactionInstruction[][] = [];

  for (let i = 0; i < safetyDeposits.length; i++) {
    const tokenSigners: Keypair[] = [];
    const tokenInstructions: TransactionInstruction[] = [];

    let safetyDepositBox: StringPublicKey;

    const me = safetyDeposits[i].draft
      .masterEdition as ParsedAccount<MasterEditionV1>;
    if (
      safetyDeposits[i].config.winningConfigType ===
        WinningConfigType.PrintingV1 &&
      me &&
      me.info.printingMint
    ) {
      safetyDepositBox = await getSafetyDepositBox(
        vault,
        //@ts-ignore
        safetyDeposits[i].draft.masterEdition.info.printingMint
      );
    } else {
      safetyDepositBox = await getSafetyDepositBox(
        vault,
        safetyDeposits[i].draft.metadata.info.mint
      );
    }
    const edition: StringPublicKey = await getEdition(
      safetyDeposits[i].draft.metadata.info.mint
    );

    const whitelistedCreator = safetyDeposits[i].draft.metadata.info.data
      .creators
      ? await findValidWhitelistedCreator(
          whitelistedCreatorsByCreator,
          //@ts-ignore
          safetyDeposits[i].draft.metadata.info.data.creators
        )
      : undefined;

    const validateBoxInstr = await validateSafetyDepositBoxV2(
      vault,
      safetyDeposits[i].draft.metadata.pubkey,
      safetyDepositBox,
      safetyDepositTokenStores[i],
      safetyDeposits[i].config.winningConfigType ===
        WinningConfigType.PrintingV1
        ? me?.info.printingMint
        : safetyDeposits[i].draft.metadata.info.mint,
      wallet.publicKey.toBase58(),
      wallet.publicKey.toBase58(),
      wallet.publicKey.toBase58(),
      edition,
      whitelistedCreator,
      store,
      safetyDeposits[i].config
    );
    tokenInstructions.push(validateBoxInstr);

    signers.push(tokenSigners);
    instructions.push(tokenInstructions);
  }
  return { instructions, signers };
}
