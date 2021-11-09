import { sendPlaceBid } from './blockchain/operations/placeBid'
import placeBidMock from './mock/bid/placeBidDto'
import { connection, walletSinger } from './common-setup'
import { getRentExemptions, getExemptionVal, RentExemp, TokenAccount } from './blockchain'
// const bidderAccount = '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan'
const amount = 0.011

export const placeBid = async () => {
  const placeBidMockNoBidder = { ...placeBidMock }
  placeBidMockNoBidder.myBidderPot = undefined

  const rentExemption = await getRentExemptions(connection)
  const accountRentExempt = getExemptionVal(rentExemption, RentExemp.AccountLayout)

  /* used in `ensureWrappedAccount` functions, 
        if  (myPayingAccount && !myPayingAccount.info.isNative) {
            return myPayingAccount.pubKey 
        }
     but I think every time `myPayingAccount.info.isNative` == true
    */
  const myPayingAccount: TokenAccount | undefined = /*await getTokenAccount(connection, wallet.publicKey)*/ undefined

  const result = await sendPlaceBid(
    walletSinger.publicKey,
    myPayingAccount,
    accountRentExempt,
    placeBidMockNoBidder,
    amount
  )
  console.log(result)
}

export const placeBidWithCancelPrevious = async () => {
  const rentExemption = await getRentExemptions(connection)
  const accountRentExempt = getExemptionVal(rentExemption, RentExemp.AccountLayout)

  /* used in `ensureWrappedAccount` functions, 
      if  (myPayingAccount && !myPayingAccount.info.isNative) {
          return myPayingAccount.pubKey 
      }
   but I think every time `myPayingAccount.info.isNative` == true
  */
  const myPayingAccount: TokenAccount | undefined = /*await getTokenAccount(connection, wallet.publicKey)*/ undefined

  const result = await sendPlaceBid(
    walletSinger.publicKey,
    myPayingAccount,
    accountRentExempt,
    placeBidMock,
    amount
  )
  console.log(result)
}
placeBid()
