export enum SaleType {
  InstantSale = 'InstantSale',
  Auction = 'Auction',
}

// delete after merge
export interface BidData {
  saleEnds: number; //days
  tickSize: number;
}
