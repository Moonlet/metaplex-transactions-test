import { Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  utils,
  findProgramAddress,
  IPartialCreateAuctionArgs,
  CreateAuctionArgs,
  StringPublicKey,
  toPublicKey,
  WalletSigner,
  AUCTION_PREFIX,
  createAuction,
  ITransactionBuilder,
} from '..';
// import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

// This command makes an auction
export async function makeAuction(
  wallet: WalletSigner,
  vault: StringPublicKey,
  auctionSettings: IPartialCreateAuctionArgs
): Promise<
  ITransactionBuilder & {
    auction: StringPublicKey;
  }
> {
  if (!wallet.publicKey) throw new Error();

  const PROGRAM_IDS = utils.programIds();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];
  const auctionKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(PROGRAM_IDS.auction).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.auction)
    )
  )[0];

  const fullSettings = new CreateAuctionArgs({
    ...auctionSettings,
    authority: wallet.publicKey.toBase58(),
    resource: vault,
  });

  const createAuctionInstr = await createAuction(
    fullSettings,
    wallet.publicKey.toBase58()
  );
  instructions.push(createAuctionInstr);

  return { instructions, signers, auction: auctionKey };
}
