import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import {
  getExemptionVal,
  ITransactionBuilder,
  PartialAuctionView,
  RentExemp,
} from '..';
import { setupPlaceBid } from '../transactions/bid';

export async function sendPlaceBid(
  publicKey: PublicKey | null,
  rentExemption: Map<RentExemp, number>,
  bidderTokenAccount: string | undefined,
  auctionView: PartialAuctionView,
  // value entered by the user adjust to decimals of the mint
  amount: number | BN
): Promise<ITransactionBuilder[]> {
  const transactions: ITransactionBuilder[] = [];

  const accountRentExempt = getExemptionVal(
    rentExemption,
    RentExemp.AccountLayout
  );

  const placeBidResult = await setupPlaceBid(
    accountRentExempt,
    publicKey,
    bidderTokenAccount,
    auctionView,
    amount
  );
  transactions.push(placeBidResult.transaction);

  return transactions;
}
