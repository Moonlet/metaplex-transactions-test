import {
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { serialize } from 'borsh';
import {
  CreateAuctionArgs,
  AUCTION_SCHEMA,
  AUCTION_PREFIX,
  getAuctionExtended,
  getBidderPotKey,
  SetAuthorityArgs,
  CancelBidArgs,
  PlaceBidArgs,
} from '../..';
import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { programIds } from '../../utils/programIds';

export async function createAuction(
  settings: CreateAuctionArgs,
  creator: StringPublicKey
): Promise<TransactionInstruction> {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(serialize(AUCTION_SCHEMA, settings));

  const auctionKey: StringPublicKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(auctionProgramId).toBuffer(),
        toPublicKey(settings.resource).toBuffer(),
      ],
      toPublicKey(auctionProgramId)
    )
  )[0];

  const keys = [
    {
      pubkey: toPublicKey(creator),
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(
        await getAuctionExtended({
          auctionProgramId,
          resource: settings.resource,
        })
      ),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: toPublicKey(auctionProgramId),
    data: data,
  });
}

export function setAuctionAuthority(
  auction: StringPublicKey,
  currentAuthority: StringPublicKey,
  newAuthority: StringPublicKey
): TransactionInstruction {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(serialize(AUCTION_SCHEMA, new SetAuthorityArgs()));

  const keys = [
    {
      pubkey: toPublicKey(auction),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(currentAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(newAuthority),
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: toPublicKey(auctionProgramId),
    data: data,
  });
}

export async function placeBid(
  bidderPubkey: StringPublicKey,
  bidderTokenPubkey: StringPublicKey,
  bidderPotTokenPubkey: StringPublicKey,
  tokenMintPubkey: StringPublicKey,
  transferAuthority: StringPublicKey,
  payer: StringPublicKey,
  resource: StringPublicKey,
  amount: BN
): Promise<TransactionInstruction> {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(
    serialize(
      AUCTION_SCHEMA,
      new PlaceBidArgs({
        resource,
        amount,
      })
    )
  );

  const auctionKey: StringPublicKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(auctionProgramId).toBuffer(),
        toPublicKey(resource).toBuffer(),
      ],
      toPublicKey(auctionProgramId)
    )
  )[0];

  const bidderPotKey = await getBidderPotKey({
    auctionProgramId,
    auctionKey,
    bidderPubkey,
  });

  const bidderMetaKey: StringPublicKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(auctionProgramId).toBuffer(),
        toPublicKey(auctionKey).toBuffer(),
        toPublicKey(bidderPubkey).toBuffer(),
        Buffer.from('metadata'),
      ],
      toPublicKey(auctionProgramId)
    )
  )[0];

  const keys = [
    {
      pubkey: toPublicKey(bidderPubkey),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(bidderTokenPubkey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(bidderPotKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(bidderPotTokenPubkey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(bidderMetaKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(
        await getAuctionExtended({ auctionProgramId, resource })
      ),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(tokenMintPubkey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(transferAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: toPublicKey(auctionProgramId),
    data: data,
  });
}

export async function cancelBid(
  bidderPubkey: StringPublicKey,
  bidderTokenPubkey: StringPublicKey,
  bidderPotTokenPubkey: StringPublicKey,
  tokenMintPubkey: StringPublicKey,
  resource: StringPublicKey
): Promise<TransactionInstruction> {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(
    serialize(
      AUCTION_SCHEMA,
      new CancelBidArgs({
        resource,
      })
    )
  );

  const auctionKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(auctionProgramId).toBuffer(),
        toPublicKey(resource).toBuffer(),
      ],
      toPublicKey(auctionProgramId)
    )
  )[0];

  const bidderPotKey = await getBidderPotKey({
    auctionProgramId,
    auctionKey,
    bidderPubkey,
  });

  const bidderMetaKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(auctionProgramId).toBuffer(),
        toPublicKey(auctionKey).toBuffer(),
        toPublicKey(bidderPubkey).toBuffer(),
        Buffer.from('metadata'),
      ],
      toPublicKey(auctionProgramId)
    )
  )[0];

  const keys = [
    {
      pubkey: toPublicKey(bidderPubkey),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(bidderTokenPubkey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(bidderPotKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(bidderPotTokenPubkey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(bidderMetaKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(
        await getAuctionExtended({ auctionProgramId, resource })
      ),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(tokenMintPubkey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: toPublicKey(auctionProgramId),
    data: data,
  });
}
