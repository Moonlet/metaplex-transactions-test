// return a list of transactions, pure functions
//  no blockchain calls
/**
 *
 * web/utils/marketplace (operations / transactions (nu ar trebui sa se cheme intre ele)) / instructions)
 *
 * - every function from /transactions should return Transaction instead of {TransactionsInstruction[], Signers[]}
// return transactions !!!!
 * - refactor transaction to build direclty ITransactionBuilder
   - refactor destructure for instructions too
 */

import { AccountLayout } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  IPartialCreateAuctionArgs,
  ITransactionBuilder,
  ParsedAccount,
  QUOTE_MINT,
  SafetyDepositDraft,
  StringPublicKey,
  WalletSigner,
  WhitelistedCreator,
} from '..';
import {
  addTokensToVault,
  buildSafetyDeposit,
  closeVault,
  createExternalPriceAccount,
  createVault,
  makeAuction,
  setupAuctionManagerInstructions,
  setupStartAuction,
  setVaultAndAuctionAuthorities,
  validateBoxes,
} from '../transactions/auction';

// params to be more friendly
// waht we need for the action
export async function createAuctionManager(
  connection: Connection,
  publicKey: PublicKey | null,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  auctionSettings: IPartialCreateAuctionArgs,
  safetyDepositDraft: SafetyDepositDraft
): Promise<ITransactionBuilder[]> {
  const paymentMint: StringPublicKey = QUOTE_MINT.toBase58();
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );
  //todo: list with all rents to remove the connection
  const transactions: ITransactionBuilder[] = [];

  // todo: send as param
  const safetyDepositConfig = buildSafetyDeposit(publicKey, safetyDepositDraft);

  //#1 create external price account
  const extAccResult = await createExternalPriceAccount(connection, publicKey);
  transactions.push(extAccResult.transaction);

  //#2 create vault
  const createVaultResult = await createVault(
    connection,
    publicKey,
    extAccResult.priceMint,
    extAccResult.externalPriceAccount
  );
  transactions.push(createVaultResult.transaction);

  //#3 create auction
  const makeAccResult = await makeAuction(
    publicKey,
    createVaultResult.vault,
    auctionSettings
  );
  transactions.push(makeAccResult.transaction);

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
    connection,
    publicKey,
    createVaultResult.vault,
    safetyDepositConfig
  );
  transactions.push(addTokensResult.transaction);

  //#6 close vault
  const closeVaultTrans = await closeVault(
    connection,
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
    makeAccResult.auction,
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
  console.log('auction: ', makeAccResult.auction);
  console.log('auctionManager: ', autionManagerResult.auctionManager);

  return transactions;
}
