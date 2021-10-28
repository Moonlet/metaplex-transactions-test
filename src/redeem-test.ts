import { connection, walletSinger } from './common-setup';
import auctionView from './mock/redeem/auctionViewItems';
import { sendRedeemBid } from './web/actions/sendRedeemBid';

const payingAccount = 'payingAccount';

export const redeemAuction = async () => {
  const result = await sendRedeemBid(
    connection,
    walletSinger,
    payingAccount,
    auctionView
  );
  console.log(result);
};
redeemAuction();
