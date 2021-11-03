import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import { WalletSigner, PartialAuctionView, ITransactionBuilderBatch } from '..';
import BN from 'bn.js';
import { setupPlaceBid } from '../transactions/bid';

export async function sendPlaceBid(
  connection: Connection,
  wallet: WalletSigner,
  bidderTokenAccount: string | undefined,
  auctionView: PartialAuctionView,
  // value entered by the user adjust to decimals of the mint
  amount: number | BN
): Promise<ITransactionBuilderBatch> {
  const signers: Keypair[][] = [];
  const instructions: TransactionInstruction[][] = [];
  const { instructions: placeBidInstr, signers: placeBidSigners } =
    await setupPlaceBid(
      connection,
      wallet,
      bidderTokenAccount,
      auctionView,
      amount
    );
  instructions.push(placeBidInstr);
  signers.push(placeBidSigners);

  return { instructions, signers };
}
