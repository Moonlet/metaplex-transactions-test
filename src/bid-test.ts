import { connection, walletSinger } from './common-setup';
import auctionView from './mock/bid/auctionView';
import { sendPlaceBid } from './web/actions/sendPlaceBid';
const bidderAccount = '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan';
const amount = 0.011;

export const placeBid = async () => {
  const { myBidderPot, ...auctionViewNoBidder } = auctionView;
  await sendPlaceBid(
    connection,
    walletSinger,
    bidderAccount,
    auctionViewNoBidder,
    amount
  );
};

export const placeBidWithCancelPrevious = async () => {
  await sendPlaceBid(
    connection,
    walletSinger,
    bidderAccount,
    auctionView as any,
    amount
  );
};
placeBid();
