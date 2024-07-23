const TronWeb = require('tronweb');

// Initialize TronWeb with the required nodes
const tronWeb = new TronWeb({
  fullNode: 'https://api.trongrid.io',
  solidityNode: 'https://api.trongrid.io',
  eventServer: 'https://api.trongrid.io',
});

const isValidTronAddress = (address) => {
  return tronWeb.isAddress(address);
};

console.log(isValidTronAddress('TRnLngpCdTZ9krWDuuHW5owZk2kv1eTY5d'))