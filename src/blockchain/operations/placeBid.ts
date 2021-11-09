import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { ITransactionBuilder, PlaceBidDto, TokenAccount } from '..'
import { setupPlaceBid } from '../transactions/bid'

export async function sendPlaceBid(
  publicKey: PublicKey | null,
  myPayingAccount: TokenAccount | undefined,
  accountRentExempt: number,
  auctionView: PlaceBidDto,
  // value entered by the user adjust to decimals of the mint
  amount: number | BN
): Promise<ITransactionBuilder[]> {
  const transactions: ITransactionBuilder[] = []

  const placeBidResult = await setupPlaceBid(
    publicKey,
    myPayingAccount,
    accountRentExempt,
    auctionView,
    amount
  )
  transactions.push(placeBidResult.transaction)

  // TODO: add transaction send fee to tiexo account

  return transactions
}
