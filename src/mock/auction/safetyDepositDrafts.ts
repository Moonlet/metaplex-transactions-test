import BN from 'bn.js';
import { AmountRange, Metadata, WinningConfigType } from '../../blockchain';
import { SafetyDepositDraft } from '../../blockchain/actions/createAuctionManager';
import { masterEdition, metadata } from '../redeem/auctionViewItems';

const metadataNFT: Metadata = Object.assign({}, metadata);
metadataNFT.updateAuthority = '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan';

export default [
  {
    holding: '8c1Zb9C5JzvW3nRdtDzhvWgZ1VNsmeWpGTh51QwvMa89',
    masterEdition: {
      pubkey: '67kGFRDHRWHhxJzuVXpZivkRyTJFUBAfeaAxfdNWgy3J',
      info: masterEdition,
    },
    metadata: {
      pubkey: 'Cuy1tipqYDAuugRU7ZfrpGYBBufzPEssRUpWUEAmKtZ',
      info: metadataNFT,
    },
    winningConfigType: WinningConfigType.FullRightsTransfer,
    amountRanges: [new AmountRange({ amount: new BN(1), length: new BN(1) })],
  },
] as SafetyDepositDraft[];
