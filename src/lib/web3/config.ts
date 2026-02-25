export const escrowContractAddress = "0xC817cb287f6019f42E8BB3deb18D02127B2a68FE";
export const usdtContractAddress = "0x25e733989d7a3782989beab08221e237c9232215";


export const escrowContractABI = [
  { "inputs": [ { "internalType": "address", "name": "_usdtToken", "type": "address" }, { "internalType": "address", "name": "_feeWallet", "type": "address" } ], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [ { "internalType": "address", "name": "owner", "type": "address" } ], "name": "OwnableInvalidOwner", "type": "error" },
  { "inputs": [ { "internalType": "address", "name": "account", "type": "address" } ], "name": "OwnableUnauthorizedAccount", "type": "error" },
  { "inputs": [ { "internalType": "address", "name": "token", "type": "address" } ], "name": "SafeERC20FailedOperation", "type": "error" },
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" } ], "name": "OwnershipTransferred", "type": "event" },
  { "inputs": [ { "internalType": "uint256", "name": "_orderId", "type": "uint256" } ], "name": "confirmReceipt", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "_orderId", "type": "uint256" }, { "internalType": "address", "name": "_seller", "type": "address" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" } ], "name": "createOrder", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "gasFeePercentage", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "lunaFeeWallet", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "name": "orders", "outputs": [ { "internalType": "address", "name": "buyer", "type": "address" }, { "internalType": "address", "name": "seller", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "enum LunaEscrow.Status", "name": "status", "type": "uint8" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "profitPercentage", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "_orderId", "type": "uint256" }, { "internalType": "bool", "name": "_refundToBuyer", "type": "bool" } ], "name": "resolveDispute", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "_profit", "type": "uint256" }, { "internalType": "uint256", "name": "_gas", "type": "uint256" } ], "name": "setPercentages", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "newOwner", "type": "address" } ], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "usdtToken", "outputs": [ { "internalType": "contract IERC20", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }
];


export const IERC20ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)"
];