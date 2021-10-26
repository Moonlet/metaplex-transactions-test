import { connection, walletSinger } from './common-setup';
import auctionView from './mock/redeem/auctionView';
import { sendRedeemBid } from './web/actions/sendRedeemBid';

const payingAccount = 'payingAccount';

export const redeemAuction = async () => {
  await sendRedeemBid(
    connection,
    walletSinger,
    payingAccount,
    auctionView as any
  );
};
redeemAuction();
