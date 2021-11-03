import { getRentExemptions } from './blockchain';
import { sendPlaceBid } from './blockchain/operations/placeBid';
import { connection, walletSinger } from './common-setup';
import auctionView from './mock/bid/auctionView';
const bidderAccount = '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan';
const amount = 0.011;

export const placeBid = async () => {
  const { myBidderPot, ...auctionViewNoBidder } = auctionView;

  const rentExemption = await getRentExemptions(connection);

  const result = await sendPlaceBid(
    walletSinger.publicKey,
    rentExemption,
    bidderAccount,
    auctionViewNoBidder,
    amount
  );
  console.log(result);
};

export const placeBidWithCancelPrevious = async () => {
  const rentExemption = await getRentExemptions(connection);

  const result = await sendPlaceBid(
    walletSinger.publicKey,
    rentExemption,
    bidderAccount,
    auctionView,
    amount
  );
  console.log(result);
};
placeBid();
