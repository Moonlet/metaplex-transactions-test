import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import {
  IPartialCreateAuctionArgs,
  PriceFloor,
  PriceFloorType,
  WinnerLimit,
  WinnerLimitType,
  QUOTE_MINT,
} from '../../blockchain';

export default {
  winners: new WinnerLimit({
    type: WinnerLimitType.Capped,
    usize: new BN(1),
  }),
  endAuctionAt: new BN(10 * 60), // seconds
  auctionGap: new BN(1 * 60), // seconds,
  priceFloor: new PriceFloor({
    type: PriceFloorType.Minimum,
    minPrice: new BN(0.01 * LAMPORTS_PER_SOL),
  }),
  tokenMint: QUOTE_MINT.toBase58(),
  gapTickSizePercentage: 2,
  tickSize: new BN(0.01 * LAMPORTS_PER_SOL),
  instantSalePrice: null,
} as IPartialCreateAuctionArgs;
