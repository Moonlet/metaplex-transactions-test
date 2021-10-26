import { ParsedAccount, WhitelistedCreator } from '../../common';

export default {
  '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan': {
    pubkey: 'DyXafh9dwRxRDpnwh8fgQKsbUdhdDyMhVrQRPf3uFzA1', //todo: see this
    info: new WhitelistedCreator({
      activated: true,
      address: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
    }),
  },
  FhwzrWRRma4VPUiAMUSsXWiDFqa63L52n73jY8Fm5fXV: {
    pubkey: '7e5HJjoEwvkYC78Kb8ZpqubVRWbtScbt6WrmD6CnPu9A', //todo: see this
    info: new WhitelistedCreator({
      activated: true,
      address: 'FhwzrWRRma4VPUiAMUSsXWiDFqa63L52n73jY8Fm5fXV',
    }),
  },
} as Record<string, ParsedAccount<WhitelistedCreator>>;
