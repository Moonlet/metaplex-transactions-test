// return a list of transactions, pure functions
//  no blockchain calls
/**
 *
 * web/utils/marketplace (operations / transactions (nu ar trebui sa se cheme intre ele)) / instructions)
 *
 * - every function from /transactions should return Transaction instead of {TransactionsInstruction[], Signers[]}
// return transactions !!!!
 * - refactor transaction to build direclty ITransactionBuilder => DONE
   - refactor destructure for instructions too => DONE
 */
import { PublicKey } from '@solana/web3.js';
import {
  buildSafetyDeposit,
  getExemptionVal,
  IPartialCreateAuctionArgs,
  ITransactionBuilder,
  ParsedAccount,
  QUOTE_MINT,
  RentExemp,
  SafetyDepositDraft,
  StringPublicKey,
  WhitelistedCreator,
} from '..';
import {
  addTokensToVault,
  closeVault,
  createExternalPriceAccount,
  createVault,
  setupAuction,
  setupAuctionManagerInstructions,
  setupStartAuction,
  setVaultAndAuctionAuthorities,
  validateBoxes,
} from '../transactions/auction';

// params to be more friendly
// waht we need for the action
export async function createAuctionManager(
  publicKey: PublicKey | null,
  rentExemption: Map<RentExemp, number>,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  auctionSettings: IPartialCreateAuctionArgs,
  safetyDepositDraft: SafetyDepositDraft
): Promise<ITransactionBuilder[]> {
  const paymentMint: StringPublicKey = QUOTE_MINT.toBase58();
  const transactions: ITransactionBuilder[] = [];

  // const rentExemption = await getRentExemptions(connection);

  // rent exemptions
  const epaRentExemption = getExemptionVal(
    rentExemption,
    RentExemp.MaxExternalAccSize
  );
  const accountRentExempt = getExemptionVal(
    rentExemption,
    RentExemp.AccountLayout
  );

  const safetyDepositConfig = buildSafetyDeposit(publicKey, safetyDepositDraft);

  //#1 create external price account
  const extAccResult = await createExternalPriceAccount(
    epaRentExemption,
    publicKey
  );
  transactions.push(extAccResult.transaction);

  //#2 create vault
  const createVaultResult = await createVault(
    rentExemption,
    publicKey,
    extAccResult.priceMint,
    extAccResult.externalPriceAccount
  );
  transactions.push(createVaultResult.transaction);

  //#3 create auction
  const setupAuctionResult = await setupAuction(
    publicKey,
    createVaultResult.vault,
    auctionSettings
  );
  transactions.push(setupAuctionResult.transaction);

  //#4 setup auction manager
  const autionManagerResult = await setupAuctionManagerInstructions(
    publicKey,
    createVaultResult.vault,
    paymentMint,
    accountRentExempt,
    auctionSettings
  );
  transactions.push(autionManagerResult.transaction);

  //#5 add tokens to vault
  const addTokensResult = await addTokensToVault(
    accountRentExempt,
    publicKey,
    createVaultResult.vault,
    safetyDepositConfig
  );
  transactions.push(addTokensResult.transaction);

  //#6 close vault
  const closeVaultTrans = await closeVault(
    accountRentExempt,
    publicKey,
    createVaultResult.vault,
    createVaultResult.fractionalMint,
    createVaultResult.fractionTreasury,
    createVaultResult.redeemTreasury,
    extAccResult.priceMint,
    extAccResult.externalPriceAccount
  );
  transactions.push(closeVaultTrans);

  //#7 set vault and auction authority
  const setVaultAuctTrans = await setVaultAndAuctionAuthorities(
    publicKey,
    createVaultResult.vault,
    setupAuctionResult.auction,
    autionManagerResult.auctionManager
  );
  transactions.push(setVaultAuctTrans);

  //#8 start auction
  const startAuctionTrans = await setupStartAuction(
    publicKey,
    createVaultResult.vault
  );
  transactions.push(startAuctionTrans);

  //#9 validate boxes
  const validateBoxesTrans = await validateBoxes(
    publicKey,
    whitelistedCreatorsByCreator,
    createVaultResult.vault,
    safetyDepositConfig,
    addTokensResult.safetyDepositTokenStore
  );
  transactions.push(validateBoxesTrans);

  console.log('vault: ', createVaultResult.vault);
  console.log('auction: ', setupAuctionResult.auction);
  console.log('auctionManager: ', autionManagerResult.auctionManager);

  return transactions;
}
