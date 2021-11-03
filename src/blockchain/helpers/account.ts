import { AccountLayout, MintLayout } from '@solana/spl-token';
import { Connection } from '@solana/web3.js';
import { MAX_EXTERNAL_ACCOUNT_SIZE, MAX_VAULT_SIZE } from '.';

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

export const getRentExemption = async (
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
