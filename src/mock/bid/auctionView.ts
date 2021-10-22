import BN from 'bn.js';
import {
  AuctionData,
  AuctionState,
  Bid,
  BidState,
  BidStateType,
  PriceFloor,
  PriceFloorType,
} from './../../common/actions/auction';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

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

export default {
  auctionManager: {
    pubkey: 'JEBT6WNy86TRcqbG4vQwAaA6n8NpzsjPDfXXvi1Fs526',
    data: {
      type: 'auctionManger',
      info: {
        pubkey: 'JEBT6WNy86TRcqbG4vQwAaA6n8NpzsjPDfXXvi1Fs526',
        instance: {
          pubkey: 'JEBT6WNy86TRcqbG4vQwAaA6n8NpzsjPDfXXvi1Fs526',
          account: {
            data: {
              type: 'Buffer',
              data: [
                10, 178, 204, 226, 204, 128, 4, 153, 123, 230, 230, 210, 164,
                15, 31, 36, 73, 153, 168, 196, 38, 186, 240, 147, 6, 64, 80, 44,
                46, 173, 9, 39, 29, 121, 76, 10, 159, 246, 155, 9, 227, 18, 156,
                173, 168, 179, 121, 103, 31, 35, 132, 136, 64, 106, 54, 128, 13,
                123, 240, 120, 173, 106, 232, 73, 31, 189, 68, 86, 148, 249,
                232, 131, 228, 78, 193, 196, 61, 20, 138, 8, 56, 47, 34, 208,
                56, 245, 85, 195, 7, 144, 122, 92, 149, 219, 90, 12, 159, 160,
                166, 236, 204, 171, 121, 174, 217, 140, 229, 114, 186, 94, 193,
                166, 48, 7, 87, 60, 48, 236, 161, 16, 61, 24, 233, 30, 135, 24,
                147, 91, 33, 91, 105, 129, 122, 167, 159, 118, 173, 49, 71, 21,
                41, 194, 103, 140, 239, 72, 218, 219, 101, 214, 135, 219, 82,
                177, 89, 149, 211, 124, 233, 73, 131, 2, 1, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              ],
            },
            executable: false,
            lamports: 3473040,
            owner: 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98',
          },
          info: {
            key: 10,
            store: 'D2xmoDZ5CFKB2CwSe5keghew8niF2PnnDeboU7dm3oTr',
            authority: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
            auction: 'DjpVdFxmbLRx7QDF9vFTFJ96iD7mzvxz5M3N49k4EHDG',
            vault: 'Bp7rwFtx9hyqVp5QrD8QijYMGNNBt9J3h21bi9TFGvpG',
            acceptPayment: '79qQoPTX4QjqEXtZVRcXxX5pT6zVaGtgQRukPBGG7tRg',
            state: {
              status: 2,
              safetyConfigItemsValidated: '01',
              bidsPushedToAcceptPayment: '00',
              hasParticipation: 0,
            },
            auctionDataExtended: 'G9jpZykBUPCRtYS6Fopzzf1hZaPQBe7fNNKcjBFrqDyw',
          },
        },
        numWinners: '01',
        safetyDepositBoxesExpected: '01',
        store: 'D2xmoDZ5CFKB2CwSe5keghew8niF2PnnDeboU7dm3oTr',
        authority: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
        vault: 'Bp7rwFtx9hyqVp5QrD8QijYMGNNBt9J3h21bi9TFGvpG',
        acceptPayment: '79qQoPTX4QjqEXtZVRcXxX5pT6zVaGtgQRukPBGG7tRg',
        auction: 'DjpVdFxmbLRx7QDF9vFTFJ96iD7mzvxz5M3N49k4EHDG',
        status: 2,
        safetyDepositConfigs: [
          {
            pubkey: '7cE8CQYn2rJHvzZmw6Wu99rKNbKVZTK8mzcDrTKvAP41',
            account: {
              data: {
                type: 'Buffer',
                data: [
                  9, 255, 247, 11, 68, 228, 245, 229, 246, 25, 131, 206, 72, 78,
                  225, 175, 131, 45, 111, 139, 238, 224, 152, 148, 206, 15, 220,
                  158, 158, 24, 70, 246, 63, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1,
                  0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                  0, 0, 0, 0,
                ],
              },
              executable: false,
              lamports: 1524240,
              owner: 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98',
            },
            info: {
              key: 9,
              auctionManager: 'JEBT6WNy86TRcqbG4vQwAaA6n8NpzsjPDfXXvi1Fs526',
              order: '00',
              winningConfigType: 1,
              amountType: 1,
              lengthType: 1,
              amountRanges: [{ amount: '01', length: '01' }],
              participationConfig: null,
              participationState: null,
            },
          },
        ],
        bidRedemptions: [],
      },
    },
  },
  vault: {
    pubkey: 'Bp7rwFtx9hyqVp5QrD8QijYMGNNBt9J3h21bi9TFGvpG',
    data: {
      type: 'vault',
      info: {
        key: 3,
        tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        fractionMint: 'CdqLmuHfLx61rh5jhFxpM6es37DBMRGwx7oABRMGsuKR',
        authority: 'JEBT6WNy86TRcqbG4vQwAaA6n8NpzsjPDfXXvi1Fs526',
        fractionTreasury: '8MhFUEtj4rH5JvURar95DJ8xc5Dh2wsoFntEadHjD5zS',
        redeemTreasury: '7sQp1oivZcQQSvQoTYXG6orYgvKnBx6s2RzFm74DDcEg',
        allowFurtherShareCreation: 1,
        pricingLookupAddress: 'ENZaEj66YD9RukdiAyXATXhDTwLH13GQMikqBWfM7hK1',
        tokenTypeCount: 1,
        state: 2,
        lockedPricePerShare: '00',
      },
    },
  },
  auction: {
    pubkey: 'DjpVdFxmbLRx7QDF9vFTFJ96iD7mzvxz5M3N49k4EHDG',
    data: {
      type: 'vault',
      info: auction,
    },
  },
  myBidderPot: {
    pubkey: 'HM2NWR2ELPmD4BfMhaFwihcs4u1DwcrENYSRstu4WjJa',
    data: {
      type: 'bidderPot',
      info: {
        bidderPot: '96zzVz6G17Eg1UosGFt4MVj2FUjLCb6Kk7FAQaDwaTis',
        bidderAct: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
        auctionAct: 'DjpVdFxmbLRx7QDF9vFTFJ96iD7mzvxz5M3N49k4EHDG',
        emptied: 0,
      },
    },
  },
};
