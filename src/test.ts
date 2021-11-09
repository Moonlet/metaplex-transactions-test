import { QUOTE_MINT } from './blockchain/utils/constants';
import { PublicKey, AccountInfo } from '@solana/web3.js';
import { getAssociatedTokenAddress, StringPublicKey, TokenAccount } from './blockchain';
import { connection } from './common-setup';
import { AccountLayout, MintInfo, MintLayout, u64 } from '@solana/spl-token';

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

export const TokenAccountParser = (
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

const ceva = async () => {
  // console.log(
  // await getWhitelistedCreator('9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan')
  // await getEdition('BXFqbV6TSGX8SST8eFtzv12PKcJZ9Nn1A2ARQPYsMHpD')
  // await getAssociatedTokenAddress(
  //   'BXFqbV6TSGX8SST8eFtzv12PKcJZ9Nn1A2ARQPYsMHpD',
  //   '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan'
  // )
  //)
  const acc = QUOTE_MINT

  const data: AccountInfo<Buffer> | null = await connection.getAccountInfo(new PublicKey(acc))
  if (data) {
    console.log(TokenAccountParser(acc.toBase58(), data))

  }
};
ceva();
