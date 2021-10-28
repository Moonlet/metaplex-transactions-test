import BN from 'bn.js';
import { WRAPPED_SOL_MINT } from '.';

export const TEN = new BN(10);
export const HALF_WAD = TEN.pow(new BN(18));
export const WAD = TEN.pow(new BN(18));
export const RAY = TEN.pow(new BN(27));
export const ZERO = new BN(0);
export const QUOTE_MINT = WRAPPED_SOL_MINT;
