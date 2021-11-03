import { getEdition, getWhitelistedCreator } from './blockchain';

const ceva = async () => {
  console.log(
    await getWhitelistedCreator('9AVaowib8ePah1VdJft6mgZtYQcHgLA4y1TAEV22Jhan')
    // await getEdition('BXFqbV6TSGX8SST8eFtzv12PKcJZ9Nn1A2ARQPYsMHpD')
  );
};
ceva();
