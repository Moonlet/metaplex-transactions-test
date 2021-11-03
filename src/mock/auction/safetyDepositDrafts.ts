import BN from 'bn.js';
import { AmountRange, Metadata, WinningConfigType } from '../../blockchain';
import { SafetyDepositDraft } from '../../blockchain/actions/createAuctionManager';
import { masterEdition, metadata } from '../redeem/auctionViewItems';

const metadataNFT: Metadata = new Metadata({ ...metadata });
metadataNFT.updateAuthority = '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan';

export default {
  holding: '8c1Zb9C5JzvW3nRdtDzhvWgZ1VNsmeWpGTh51QwvMa89', // tokenAccount
  // masterEdition: {
  //   pubkey: '67kGFRDHRWHhxJzuVXpZivkRyTJFUBAfeaAxfdNWgy3J',
  //   info: masterEdition, // get from DB
  // },
  metadata: {
    pubkey: 'Cuy1tipqYDAuugRU7ZfrpGYBBufzPEssRUpWUEAmKtZ',
    info: metadataNFT,
  },
  winningConfigType: WinningConfigType.FullRightsTransfer,
  amountRanges: [new AmountRange({ amount: new BN(1), length: new BN(1) })],
} as SafetyDepositDraft;

/* 
  API calls: 
  - get tokenAccount for mint (maybe get from blockchain) => `holding`
  - get metadata for NFT: {"data.info.mint": "BXFqbV6TSGX8SST8eFtzv12PKcJZ9Nn1A2ARQPYsMHpD"} => `metadata.info`
    (get edition / masterEdition pubKey for mint) => is done in UI
  - get metadata for master edition:  {pubkey: "67kGFRDHRWHhxJzuVXpZivkRyTJFUBAfeaAxfdNWgy3J"} => `masterEdition.info`
*/
