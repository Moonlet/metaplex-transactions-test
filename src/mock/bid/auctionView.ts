import {
  Vault,
  SafetyDepositBox,
} from '../../blockchain/instructions-builder/main/vault';

import BN from 'bn.js';
import {
  AuctionData,
  AuctionState,
  Bid,
  BidderPot,
  BidState,
  BidStateType,
  PriceFloor,
  PriceFloorType,
} from '../../blockchain/instructions-builder/main/auction';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  AmountRange,
  AuctionManager,
  AuctionManagerStateV2,
  AuctionManagerStatus,
  AuctionManagerV2,
  PartialAuctionView,
  SafetyDepositConfig,
  TupleNumericType,
  WinningConfigType,
} from '../../blockchain';

const auction: AuctionData = new AuctionData({
  authority: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
  tokenMint: 'So11111111111111111111111111111111111111112',
  lastBid: new BN('6172514b', 'hex'),
  endedAt: new BN('6172b31b', 'hex'),
  endAuctionAt: new BN('015180', 'hex'),
  auctionGap: new BN('012c', 'hex'),
  priceFloor: new PriceFloor({
    type: PriceFloorType.Minimum,
    minPrice: new BN(0.01 * LAMPORTS_PER_SOL),
  }),
  state: AuctionState.Started,
  bidState: new BidState({
    type: BidStateType.EnglishAuction,
    max: new BN('01', 'hex'),
    bids: [
      new Bid({
        key: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
        amount: new BN('a7d8c0', 'hex'),
      }),
    ],
  }),
  totalUncancelledBids: new BN(0),
});

const auctionManagerStateV2: AuctionManagerStateV2 =
  new AuctionManagerStateV2();
auctionManagerStateV2.status = AuctionManagerStatus.Running;
auctionManagerStateV2.safetyConfigItemsValidated = new BN(1);
auctionManagerStateV2.bidsPushedToAcceptPayment = new BN(0);
auctionManagerStateV2.hasParticipation = false;

const auctionInstance: AuctionManagerV2 = new AuctionManagerV2({
  store: 'D2xmoDZ5CFKB2CwSe5keghew8niF2PnnDeboU7dm3oTr',
  authority: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
  auction: 'DjpVdFxmbLRx7QDF9vFTFJ96iD7mzvxz5M3N49k4EHDG',
  vault: 'Bp7rwFtx9hyqVp5QrD8QijYMGNNBt9J3h21bi9TFGvpG',
  acceptPayment: '79qQoPTX4QjqEXtZVRcXxX5pT6zVaGtgQRukPBGG7tRg',
  state: auctionManagerStateV2,
});

const vault: Vault = new Vault({
  tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  fractionMint: 'CdqLmuHfLx61rh5jhFxpM6es37DBMRGwx7oABRMGsuKR',
  authority: 'JEBT6WNy86TRcqbG4vQwAaA6n8NpzsjPDfXXvi1Fs526',
  fractionTreasury: '8MhFUEtj4rH5JvURar95DJ8xc5Dh2wsoFntEadHjD5zS',
  redeemTreasury: '7sQp1oivZcQQSvQoTYXG6orYgvKnBx6s2RzFm74DDcEg',
  allowFurtherShareCreation: true,
  pricingLookupAddress: 'ENZaEj66YD9RukdiAyXATXhDTwLH13GQMikqBWfM7hK1',
  tokenTypeCount: 1,
  state: 2,
  lockedPricePerShare: new BN(0),
});

const safetyDeposit: SafetyDepositConfig = new SafetyDepositConfig({
  directArgs: {
    auctionManager: 'JEBT6WNy86TRcqbG4vQwAaA6n8NpzsjPDfXXvi1Fs526',
    order: new BN(0),
    winningConfigType: WinningConfigType.FullRightsTransfer,
    amountType: TupleNumericType.U8,
    lengthType: TupleNumericType.U8,
    amountRanges: [new AmountRange({ amount: new BN(1), length: new BN(1) })],
    participationConfig: null,
    participationState: null,
  },
});

const auctiomManager: AuctionManager = new AuctionManager({
  instance: {
    pubkey: 'JEBT6WNy86TRcqbG4vQwAaA6n8NpzsjPDfXXvi1Fs526',
    info: auctionInstance,
  },
  auction: {
    pubkey: 'DjpVdFxmbLRx7QDF9vFTFJ96iD7mzvxz5M3N49k4EHDG',
    info: auction,
  },
  vault: {
    pubkey: 'Bp7rwFtx9hyqVp5QrD8QijYMGNNBt9J3h21bi9TFGvpG',
    info: vault,
  },
  safetyDepositConfigs: [
    {
      pubkey: '7cE8CQYn2rJHvzZmw6Wu99rKNbKVZTK8mzcDrTKvAP41',
      info: safetyDeposit,
    },
  ],
  bidRedemptions: [],
});

const bidderPot = new BidderPot({
  bidderPot: '96zzVz6G17Eg1UosGFt4MVj2FUjLCb6Kk7FAQaDwaTis',
  bidderAct: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
  auctionAct: 'DjpVdFxmbLRx7QDF9vFTFJ96iD7mzvxz5M3N49k4EHDG',
  emptied: false,
});

export default {
  auctionManager: {
    pubkey: 'JEBT6WNy86TRcqbG4vQwAaA6n8NpzsjPDfXXvi1Fs526',
    data: {
      type: 'auctionManger',
      info: auctiomManager,
    },
  },
  vault: {
    pubkey: 'Bp7rwFtx9hyqVp5QrD8QijYMGNNBt9J3h21bi9TFGvpG',
    data: {
      type: 'vault',
      info: vault,
    },
  },
  auction: {
    pubkey: 'DjpVdFxmbLRx7QDF9vFTFJ96iD7mzvxz5M3N49k4EHDG',
    data: {
      type: 'auction',
      info: auction,
    },
  },
  myBidderPot: {
    pubkey: 'HM2NWR2ELPmD4BfMhaFwihcs4u1DwcrENYSRstu4WjJa',
    data: {
      type: 'bidderPot',
      info: bidderPot,
    },
  },
} as PartialAuctionView;
