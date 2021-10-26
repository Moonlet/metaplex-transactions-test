import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import {
  IPartialCreateAuctionArgs,
  PriceFloor,
  PriceFloorType,
  WinnerLimit,
  WinnerLimitType,
  QUOTE_MINT,
} from '../../common';

export default {
  winners: new WinnerLimit({
    type: WinnerLimitType.Capped,
    usize: new BN(1),
  }),
  endAuctionAt: null,
  auctionGap: null,
  priceFloor: new PriceFloor({
    type: PriceFloorType.Minimum,
    minPrice: new BN(0.01 * LAMPORTS_PER_SOL),
  }),
  tokenMint: QUOTE_MINT.toBase58(),
  gapTickSizePercentage: null,
  tickSize: null,
  instantSalePrice: new BN('989680', 'hex'),
  name: null,
} as IPartialCreateAuctionArgs;
