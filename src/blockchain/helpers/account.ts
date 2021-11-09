import { connection } from './../../common-setup';
import {
  AccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
  u64,
} from '@solana/spl-token';
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import { MAX_EXTERNAL_ACCOUNT_SIZE, MAX_VAULT_SIZE } from '.';
import { StringPublicKey, TokenAccount } from '..';

export enum RentExemp {
  AccountLayout = 'AccountLayout',
  MaxExternalAccSize = 'MaxExternalAccSize',
  MintLayout = 'MintLayout',
  MaxVaultSize = 'MaxVaultSize',
}

const convertExemptionEnum = (type: RentExemp): any => {
  switch (type) {
    case RentExemp.AccountLayout: {
      return AccountLayout.span;
    }
    case RentExemp.MaxExternalAccSize: {
      return MAX_EXTERNAL_ACCOUNT_SIZE;
    }
    case RentExemp.MintLayout: {
      return MintLayout.span;
    }
    case RentExemp.MaxVaultSize: {
      return MAX_VAULT_SIZE;
    }
    default:
      return null;
  }
};

export const getRentExemptions = async (
  connection: Connection
): Promise<Map<RentExemp, number>> => {
  const finalData: Map<RentExemp, number> = new Map();

  for (const rentType of Object.keys(RentExemp)) {
    const result = await connection.getMinimumBalanceForRentExemption(
      convertExemptionEnum(RentExemp[rentType as RentExemp])
    );
    finalData.set(RentExemp[rentType as RentExemp], result);
  }
  return finalData;
};

export const getExemptionVal = (
  map: Map<RentExemp, number>,
  type: RentExemp
): number => {
  const value = map.get(type);
  if (value !== 0 && !value) {
    throw new Error('Missing exemption rent for: ' + type);
  }
  return value;
};

export const getAssociatedTokenAddress = async (
  mint: string,
  owner: string
): Promise<string> => {
  try {
    const associatedAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID, // change here program if needed and send it on params
      TOKEN_PROGRAM_ID, // change here program if needed and send it on params
      new PublicKey(mint),
      new PublicKey(owner)
    );
    return associatedAddress.toString();
  } catch (error) {
    return Promise.reject(error);
  }
};

export const deserializeAccount = (data: Buffer) => {
  const accountInfo = AccountLayout.decode(data);
  accountInfo.mint = new PublicKey(accountInfo.mint);
  accountInfo.owner = new PublicKey(accountInfo.owner);
  accountInfo.amount = u64.fromBuffer(accountInfo.amount);

  if (accountInfo.delegateOption === 0) {
    accountInfo.delegate = null;
    accountInfo.delegatedAmount = new u64(0);
  } else {
    accountInfo.delegate = new PublicKey(accountInfo.delegate);
    accountInfo.delegatedAmount = u64.fromBuffer(accountInfo.delegatedAmount);
  }

  accountInfo.isInitialized = accountInfo.state !== 0;
  accountInfo.isFrozen = accountInfo.state === 2;

  if (accountInfo.isNativeOption === 1) {
    accountInfo.rentExemptReserve = u64.fromBuffer(accountInfo.isNative);
    accountInfo.isNative = true;
  } else {
    accountInfo.rentExemptReserve = null;
    accountInfo.isNative = false;
  }

  if (accountInfo.closeAuthorityOption === 0) {
    accountInfo.closeAuthority = null;
  } else {
    accountInfo.closeAuthority = new PublicKey(accountInfo.closeAuthority);
  }

  return accountInfo;
};

export const tokenAccountParser = (
  pubKey: StringPublicKey,
  info: AccountInfo<Buffer>,
) => {
  // Sometimes a wrapped sol account gets closed, goes to 0 length,
  // triggers an update over wss which triggers this guy to get called
  // since your UI already logged that pubkey as a token account. Check for length.
  if (info.data.length > 0) {
    const buffer = Buffer.from(info.data);
    const data = deserializeAccount(buffer);

    const details = {
      pubkey: pubKey,
      account: {
        ...info,
      },
      info: data,
    } as TokenAccount;

    return details;
  }
};

export const getTokenAccount = async (connection: Connection, pubkey: PublicKey): Promise<TokenAccount | undefined> => {
  const data: AccountInfo<Buffer> | null = await connection.getAccountInfo(new PublicKey(pubkey))
  if (!data) {
    return undefined
  }
  return tokenAccountParser(pubkey.toBase58(), data)
}
