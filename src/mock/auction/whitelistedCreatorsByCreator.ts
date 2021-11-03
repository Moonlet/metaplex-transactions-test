import { ParsedAccount, WhitelistedCreator } from '../../blockchain';

// prettier-ignore
export default {
  '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan': {
    pubkey: 'DyXafh9dwRxRDpnwh8fgQKsbUdhdDyMhVrQRPf3uFzA1', //pubKey from metapelx program
    info: new WhitelistedCreator({
      activated: true,
      address: '9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan',
    }),
  },
  'FhwzrWRRma4VPUiAMUSsXWiDFqa63L52n73jY8Fm5fXV': {
    pubkey: '7e5HJjoEwvkYC78Kb8ZpqubVRWbtScbt6WrmD6CnPu9A',
    info: new WhitelistedCreator({
      activated: true,
      address: 'FhwzrWRRma4VPUiAMUSsXWiDFqa63L52n73jY8Fm5fXV',
    }),
  },
} as Record<string, ParsedAccount<WhitelistedCreator>>;
