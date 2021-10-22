import { ParsedAccount, WhitelistedCreator } from './common';
import { connection, walletSinger } from './common-setup';
import auctionSettings from './mock/auction/auctionSettings';
import safetyDepositDraftsDummy from './mock/auction/safetyDepositDrafts';
import whitelistedCreatorsByCreatorDummy from './mock/auction/whitelistedCreatorsByCreator';
import {
  createAuctionManager,
  SafetyDepositDraft,
} from './web/actions/createAuctionManager';

export const triggerAction = async () => {
  const whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  > = whitelistedCreatorsByCreatorDummy as any;

  const safetyDepositDrafts: SafetyDepositDraft[] =
    safetyDepositDraftsDummy as any;

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
