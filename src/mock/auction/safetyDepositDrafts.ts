import BN from 'bn.js';
import { AmountRange, Metadata, WinningConfigType } from '../../common';
import { SafetyDepositDraft } from '../../web/actions/createAuctionManager';
import { masterEdition, metadata } from '../redeem/auctionViewItems';

const metadataAuction: Metadata = Object.assign({}, metadata);
metadataAuction.updateAuthority =
  '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan';

export default [
  {
    holding: '8c1Zb9C5JzvW3nRdtDzhvWgZ1VNsmeWpGTh51QwvMa89',
    masterEdition: {
      pubkey: '67kGFRDHRWHhxJzuVXpZivkRyTJFUBAfeaAxfdNWgy3J',
      info: masterEdition,
    },
    metadata: {
      pubkey: 'Cuy1tipqYDAuugRU7ZfrpGYBBufzPEssRUpWUEAmKtZ',
      info: metadataAuction,
    },
    winningConfigType: WinningConfigType.FullRightsTransfer,
    amountRanges: [new AmountRange({ amount: new BN(1), length: new BN(1) })],
  },
] as SafetyDepositDraft[];
