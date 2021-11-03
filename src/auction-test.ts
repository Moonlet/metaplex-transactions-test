import { getRentExemptions } from './blockchain';
import { createAuctionManager } from './blockchain/operations/createAuction';
import { connection, walletSinger } from './common-setup';
import auctionSettingsInstantSale from './mock/auction/auctionSettingsInstantSale';
import safetyDepositDraft from './mock/auction/safetyDepositDrafts';
import whitelistedCreatorsByCreator from './mock/auction/whitelistedCreatorsByCreator';
import { buildAuctionSettings } from './ui/auction-settings';
import { SaleType } from './ui/types';

export const triggerAuction = async () => {
  const auctionSettingsBuidler = buildAuctionSettings(SaleType.Auction, 0.01, {
    saleEnds: 1,
    tickSize: 0.01,
  });
  if (!auctionSettingsBuidler) {
    console.error('Failed to build settings');
    return;
  }

  const rentExemption = await getRentExemptions(connection);

  const result = await createAuctionManager(
    walletSinger.publicKey,
    rentExemption,
    whitelistedCreatorsByCreator, // this is a kind of cache, if missing => getWhitelistedCreator(creator: StringPublicKey) will be called
    auctionSettingsBuidler,
    safetyDepositDraft
  );

  console.log(result);
};

export const triggerAuctionInstantSale = async () => {
  const rentExemption = await getRentExemptions(connection);

  const result = await createAuctionManager(
    walletSinger.publicKey,
    rentExemption,
    whitelistedCreatorsByCreator,
    auctionSettingsInstantSale,
    safetyDepositDraft
  );

  console.log(result);
};

triggerAuctionInstantSale();
