import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  AuctionData,
  AuctionState,
  Bid,
  BidState,
  BidStateType,
  PlaceBidDto,
  PriceFloor,
  PriceFloorType,
} from '../../blockchain';
import BN from 'bn.js';

const auction: AuctionData = new AuctionData({
  authority: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
  tokenMint: 'So11111111111111111111111111111111111111112',
  lastBid: new BN('6172514b', 'hex'),
  endedAt: new BN('6172b31b', 'hex'),
  endAuctionAt: new BN('015180', 'hex'),
  auctionGap: new BN('012c', 'hex'),
  priceFloor: new PriceFloor({
    type: PriceFloorType.Minimum,
    minPrice: new BN(0.01 * LAMPORTS_PER_SOL),
  }),
  state: AuctionState.Started,
  bidState: new BidState({
    type: BidStateType.EnglishAuction,
    max: new BN('01', 'hex'),
    bids: [
      new Bid({
        key: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
        amount: new BN('a7d8c0', 'hex'),
      }),
    ],
  }),
  totalUncancelledBids: new BN(0),
});

export default {
  auction: {
    pubkey: 'DjpVdFxmbLRx7QDF9vFTFJ96iD7mzvxz5M3N49k4EHDG',
    data: {
      type: 'auction',
      info: auction,
    },
  },
  vault: 'Bp7rwFtx9hyqVp5QrD8QijYMGNNBt9J3h21bi9TFGvpG',
  myBidderPot: '96zzVz6G17Eg1UosGFt4MVj2FUjLCb6Kk7FAQaDwaTis',
} as PlaceBidDto;
