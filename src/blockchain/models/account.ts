import { AccountInfo as TokenAccountInfo } from '@solana/spl-token';
import { AccountInfo } from '@solana/web3.js';

// import BufferLayout from 'buffer-layout';

export interface TokenAccount {
  pubkey: string;
  account: AccountInfo<Buffer>;
  info: TokenAccountInfo;
}

export interface ParsedDataAccount {
  amount: number;
  rawAmount: string;
  parsedAssetAddress: string;
  parsedAccount: any;
  assetDecimals: number;
  assetIcon: any;
  name: string;
  symbol: string;
  sourceAddress: string;
  targetAddress: string;
}

// export const ParsedDataLayout = BufferLayout.struct([
//   BufferLayout.blob(32, 'amount'),
//   BufferLayout.u8('toChain'),
//   BufferLayout.blob(32, 'sourceAddress'),
//   BufferLayout.blob(32, 'targetAddress'),
//   BufferLayout.blob(32, 'assetAddress'),
//   BufferLayout.u8('assetChain'),
//   BufferLayout.u8('assetDecimals'),
//   BufferLayout.seq(BufferLayout.u8(), 1), // 4 byte alignment because a u32 is following
//   BufferLayout.u32('nonce'),
//   BufferLayout.blob(1001, 'vaa'),
//   BufferLayout.seq(BufferLayout.u8(), 3), // 4 byte alignment because a u32 is following
//   BufferLayout.u32('vaaTime'),
//   BufferLayout.u32('lockupTime'),
//   BufferLayout.u8('pokeCounter'),
//   BufferLayout.blob(32, 'signatureAccount'),
//   BufferLayout.u8('initialized'),
// ]);
