import { connection, walletSinger } from './common-setup';
import auctionSettings from './mock/auction/auctionSettings';
import safetyDepositDrafts from './mock/auction/safetyDepositDrafts';
import whitelistedCreatorsByCreator from './mock/auction/whitelistedCreatorsByCreator';
import { createAuctionManager } from './web/actions/createAuctionManager';

export const triggerAction = async () => {
  console.log(whitelistedCreatorsByCreator);
  console.log('~~~~~~~INPUT DATA~~~~~~~');
  // console.log(auctionSettings);
  // console.log(safetyDepositDrafts);
  // console.log(whitelistedCreatorsByCreator);

  console.log('~~~~~~~START PROCESSING~~~~~~');
  const result = await createAuctionManager(
    connection,
    walletSinger,
    whitelistedCreatorsByCreator,
    auctionSettings,
    safetyDepositDrafts
  );

  console.log(result);

  console.log('~~~~~~~END PROCESSING~~~~~~');
};

triggerAction();
