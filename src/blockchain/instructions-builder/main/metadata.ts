import { TransactionInstruction } from '@solana/web3.js';
import { StringPublicKey, toPublicKey } from '../../utils';
import { programIds } from '../../utils/programIds';

export function updatePrimarySaleHappenedViaToken(
  metadata: StringPublicKey,
  owner: StringPublicKey,
  tokenAccount: StringPublicKey
): TransactionInstruction {
  const metadataProgramId = programIds().metadata;

  const data = Buffer.from([4]);

  const keys = [
    {
      pubkey: toPublicKey(metadata),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(owner),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(tokenAccount),
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: toPublicKey(metadataProgramId),
    data,
  });
}
