import {
  MasterEditionV1,
  MasterEditionV2,
  ParsedAccount,
  StringPublicKey,
} from './blockchain';
import {
  createAuctionManager,
  SafetyDepositDraft,
} from './blockchain/actions/createAuctionManager';
import { connection, walletSinger } from './common-setup';
import auctionSettingsInstantSale from './mock/auction/auctionSettingsInstantSale';
import safetyDepositDraft from './mock/auction/safetyDepositDrafts';
import whitelistedCreatorsByCreator from './mock/auction/whitelistedCreatorsByCreator';
import { masterEdition } from './mock/redeem/auctionViewItems';
import { buildAuctionSettings } from './ui/auction-settings';
import { SaleType } from './ui/types';

// todo: get from DB: {pubkey: "67kGFRDHRWHhxJzuVXpZivkRyTJFUBAfeaAxfdNWgy3J"}
const getMasterEditionAccount = async (
  pubkey: StringPublicKey
): Promise<ParsedAccount<MasterEditionV1 | MasterEditionV2>> => {
  return {
    pubkey,
    info: masterEdition,
  };
};

const initSafetyDeposit = async (): Promise<SafetyDepositDraft> => {
  const localSafetyDraft: SafetyDepositDraft = { ...safetyDepositDraft };

  await localSafetyDraft.metadata.info.init(); // initialize edition & masterEdition fields
  const masterEdition = localSafetyDraft.metadata.info.masterEdition;
  if (masterEdition) {
    localSafetyDraft.masterEdition = await getMasterEditionAccount(
      masterEdition
    );
    return localSafetyDraft;
  }
  throw new Error('Missing master edition');
};

export const triggerAuction = async () => {
  const safetyDeposit = await initSafetyDeposit();
  console.log(safetyDeposit);

  const auctionSettingsBuidler = buildAuctionSettings(SaleType.Auction, 0.01, {
    saleEnds: 1,
    tickSize: 0.01,
  });
  if (!auctionSettingsBuidler) {
    console.error('Failed to build settings');
    return;
  }

  console.log('~~~~~~~START PROCESSING~~~~~~');
  const result = await createAuctionManager(
    connection,
    walletSinger,
    whitelistedCreatorsByCreator, // this is a kind of cache, if missing => getWhitelistedCreator(creator: StringPublicKey) will be called
    auctionSettingsBuidler,
    [safetyDeposit]
  );

  console.log(result);

  console.log('~~~~~~~END PROCESSING~~~~~~');
};

export const triggerAuctionInstantSale = async () => {
  const safetyDeposit = await initSafetyDeposit();
  console.log('~~~~~~~INPUT DATA~~~~~~~');
  // console.log(auctionSettings);
  // console.log(safetyDepositDrafts);
  // console.log(whitelistedCreatorsByCreator);

  console.log('~~~~~~~START PROCESSING~~~~~~');
  const result = await createAuctionManager(
    connection,
    walletSinger,
    whitelistedCreatorsByCreator,
    auctionSettingsInstantSale,
    [safetyDeposit]
  );

  console.log(result);

  console.log('~~~~~~~END PROCESSING~~~~~~');
};

triggerAuction();
