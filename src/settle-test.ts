import { connection, walletSinger } from './common-setup';
import auctionView from './mock/redeem/auctionViewItems';
import bidsToClaim from './mock/redeem/bidsToClaim';
import { settle } from './blockchain/actions/settle';

const payingAccount = '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan';

export const settleAuction = async () => {
  const result = await settle(
    connection,
    walletSinger,
    auctionView,
    bidsToClaim,
    payingAccount
  );

  console.log(result);
};
settleAuction();
