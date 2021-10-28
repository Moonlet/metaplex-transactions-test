import { BidderPot, ParsedAccount } from '../../blockchain';

export default [
  {
    pubkey: 'HM2NWR2ELPmD4BfMhaFwihcs4u1DwcrENYSRstu4WjJa',
    info: new BidderPot({
      bidderPot: '96zzVz6G17Eg1UosGFt4MVj2FUjLCb6Kk7FAQaDwaTis',
      bidderAct: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
      auctionAct: 'DjpVdFxmbLRx7QDF9vFTFJ96iD7mzvxz5M3N49k4EHDG',
      emptied: false,
    }),
  },
] as ParsedAccount<BidderPot>[];
