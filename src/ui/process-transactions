import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  sendTransactions,
  sendTransactionWithRetry,
  SequenceType,
  WalletSigner,
} from '../blockchain';

const MAX_NUMBER_RETRIES = 3;

export const processTransactions = async (
  connection: Connection,
  wallet: WalletSigner,
  instructions: TransactionInstruction[][],
  signers: Keypair[][]
) => {
  let signersCopy = [...signers];
  let instructionsCopy = [...instructions];

  let stopPoint = 0;
  let tries = 0;
  let lastInstructionsLength: number | null = null;
  while (stopPoint < instructionsCopy.length && tries < MAX_NUMBER_RETRIES) {
    instructionsCopy = instructionsCopy.slice(
      stopPoint,
      instructionsCopy.length
    );
    signersCopy = signersCopy.slice(stopPoint, signersCopy.length);

    if (instructionsCopy.length === lastInstructionsLength) {
      tries = tries + 1;
    } else {
      tries = 0;
    }

    try {
      if (instructionsCopy.length === 1) {
        await sendTransactionWithRetry(
          connection,
          wallet,
          instructionsCopy[0],
          signersCopy[0],
          'single'
        );
        stopPoint = 1;
      } else {
        stopPoint = await sendTransactions(
          connection,
          wallet,
          instructionsCopy,
          signersCopy,
          SequenceType.StopOnFailure,
          'single'
        );
      }
    } catch (e) {
      console.error(e);
    }
    console.log(
      'Died on ',
      stopPoint,
      'retrying from instruction',
      instructionsCopy[stopPoint],
      'instructions length is',
      instructionsCopy.length
    );
    lastInstructionsLength = instructionsCopy.length;
  }

  if (stopPoint < instructionsCopy.length) {
    throw new Error('Failed to create');
  }
};
