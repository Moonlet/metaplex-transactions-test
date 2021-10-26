import { connection, walletSinger } from './common-setup';
import auctionView from './mock/redeem/auctionViewItems';
import bidsToClaim from './mock/redeem/bidsToClaim';
import { settle } from './web/actions/settle';

const payingAccount = '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan';

export const settleAuction = async () => {
  await settle(
    connection,
    walletSinger,
    auctionView,
    bidsToClaim,
    payingAccount
  );
};
settleAuction();
