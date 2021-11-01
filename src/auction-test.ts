import { connection, walletSinger } from './common-setup';
import { createAuctionManager } from './blockchain/actions/createAuctionManager';
import auctionSettings from './mock/auction/auctionSettings';
import auctionSettingsInstantSale from './mock/auction/auctionSettingsInstantSale';
import safetyDepositDrafts from './mock/auction/safetyDepositDrafts';
import whitelistedCreatorsByCreator from './mock/auction/whitelistedCreatorsByCreator';
import { buildAuctionSettings } from './ui/auction-settings';
import { SaleType } from './ui/types';

export const triggerAuction = async () => {
  console.log('~~~~~~~INPUT DATA~~~~~~~');
  // console.log(auctionSettings);
  // console.log(safetyDepositDrafts);
  // console.log(whitelistedCreatorsByCreator);

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
    whitelistedCreatorsByCreator,
    auctionSettingsBuidler,
    safetyDepositDrafts
  );

  console.log(result);

  console.log('~~~~~~~END PROCESSING~~~~~~');
};

export const triggerAuctionInstantSale = async () => {
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
    safetyDepositDrafts
  );

  console.log(result);

  console.log('~~~~~~~END PROCESSING~~~~~~');
};

triggerAuction();
