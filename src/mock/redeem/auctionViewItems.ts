import BN from 'bn.js';

import defaultAuctionView from '../bid/auctionView';
import {
  AuctionViewItem,
  BidderMetadata,
  MasterEditionV2,
  Metadata,
  MetadataKey,
  PartialAuctionView,
  SafetyDepositBox,
} from '../../blockchain';

export const metadata: Metadata = new Metadata({
  updateAuthority: 'JEBT6WNy86TRcqbG4vQwAaA6n8NpzsjPDfXXvi1Fs526',
  mint: 'BXFqbV6TSGX8SST8eFtzv12PKcJZ9Nn1A2ARQPYsMHpD',
  data: {
    name: 'novi',
    symbol: '',
    uri: 'https://arweave.net/iJwA4PGbdxY8c2hm8DIgGapke7MFuSXNG9VUoIYTG18',
    sellerFeeBasisPoints: 1000,
    creators: [
      {
        address: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
        verified: true,
        share: 100,
      },
    ],
  },
  primarySaleHappened: false,
  isMutable: true,
  editionNonce: 254,
});

// metadata.init();
// metadata.edition = '67kGFRDHRWHhxJzuVXpZivkRyTJFUBAfeaAxfdNWgy3J';
// metadata.masterEdition = '67kGFRDHRWHhxJzuVXpZivkRyTJFUBAfeaAxfdNWgy3J';

const safetyDeposit = new SafetyDepositBox({
  vault: 'Bp7rwFtx9hyqVp5QrD8QijYMGNNBt9J3h21bi9TFGvpG',
  tokenMint: 'BXFqbV6TSGX8SST8eFtzv12PKcJZ9Nn1A2ARQPYsMHpD',
  store: '1cz2hhmtcFh5hF8TzYbVLjvkatwrGrAZ6ttE7PVgmWV',
  order: 0,
});

export const masterEdition = new MasterEditionV2({
  key: MetadataKey.MasterEditionV2,
  supply: new BN(0),
  maxSupply: new BN(1),
});

const bidderMetaData = new BidderMetadata({
  bidderPubkey: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
  auctionPubkey: 'DjpVdFxmbLRx7QDF9vFTFJ96iD7mzvxz5M3N49k4EHDG',
  lastBid: new BN('a7d8c0', 'hex'),
  lastBidTimestamp: new BN('6172514b', 'hex'),
  cancelled: false,
});

const auctionItem: AuctionViewItem = {
  metadata: {
    pubkey: 'Cuy1tipqYDAuugRU7ZfrpGYBBufzPEssRUpWUEAmKtZ',
    info: metadata,
  },
  winningConfigType: 1,
  safetyDeposit: {
    pubkey: '5gN6mRhYTuVgViNszxRF1UJ2ZfLXUpw4yeXhKPu1Max3',
    info: safetyDeposit,
  },
  amount: new BN('01'),
  masterEdition: {
    pubkey: '67kGFRDHRWHhxJzuVXpZivkRyTJFUBAfeaAxfdNWgy3J',
    info: masterEdition,
  },
};

export default {
  ...defaultAuctionView,
  items: [[auctionItem]],
  myBidderMetadata: {
    // only used auctionView.myBidderMetadata.data.info.bidderPubkey => replace with myBidderPot.data.info.bidderAct
    pubkey: 'F29RzJDZ816eyU4BL6GkVeFmELa9chcgMJM3wynwstRg',
    data: {
      type: 'myBidderMetadata',
      info: bidderMetaData,
    },
  },
} as PartialAuctionView;
