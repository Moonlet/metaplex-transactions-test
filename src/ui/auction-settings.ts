import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import {
  IPartialCreateAuctionArgs,
  PriceFloor,
  PriceFloorType,
  QUOTE_MINT,
  WinnerLimit,
  WinnerLimitType,
} from '../blockchain';
import { BidData, SaleType } from './types';

export const buildAuctionSettings = (
  type: SaleType,
  amount: number,
  auctionData?: BidData
): IPartialCreateAuctionArgs | undefined => {
  if (type === SaleType.Auction && !auctionData) {
    return undefined;
  }
  const isAuction = type === SaleType.Auction;

  return {
    winners: new WinnerLimit({
      type: WinnerLimitType.Capped,
      usize: new BN(1),
    }),
    tokenMint: QUOTE_MINT.toBase58(),
    endAuctionAt: isAuction
      ? new BN((auctionData?.saleEnds || 0) * 60 * 60 * 24) // seconds
      : null,
    auctionGap: isAuction ? new BN(1 * 60) : null, // seconds,
    gapTickSizePercentage: isAuction ? 5 : null, // todo: see this default value
    tickSize: isAuction
      ? new BN((auctionData?.tickSize || 0) * LAMPORTS_PER_SOL)
      : null,
    instantSalePrice: isAuction ? null : new BN(amount * LAMPORTS_PER_SOL),
    priceFloor: new PriceFloor({
      type: PriceFloorType.Minimum,
      minPrice: new BN(amount * LAMPORTS_PER_SOL), // auction price
    }),
  };
};
