// G:\Luna Website\functions\src\types.ts
import { Contract, ContractTransactionResponse, ContractTransactionReceipt } from 'ethers';

// 定义 USDTEscrow 合约的接口，使其在 TypeScript 中类型安全
// 这需要根据 USDTEscrow.sol 的实际函数和事件来定义
export interface USDTEscrow extends Contract {
    // Read functions
    arbiter(): Promise<string>;
    usdtToken(): Promise<string>;
    feePercentageBps(): Promise<bigint>;
    orders(orderId: string): Promise<{
        buyer: string;
        seller: string;
        amount: bigint;
        state: number; // enum OrderState { Empty, Created, Locked, Released, Disputed, Refunded }
    }>;

    // Write functions
    createOrder(
        orderId: string,
        buyer: string,
        seller: string,
        amount: bigint
    ): Promise<ContractTransactionResponse>;

    lockFunds(
        orderId: string
    ): Promise<ContractTransactionResponse>;

    confirmDelivery(
        orderId: string
    ): Promise<ContractTransactionResponse>;

    openDispute(
        orderId: string
    ): Promise<ContractTransactionResponse>;

    resolveDispute(
        orderId: string,
        releaseToSeller: boolean
    ): Promise<ContractTransactionResponse>;

    // Events (可以使用 contract.on() 监听)
    // event OrderCreated(bytes32 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    // event OrderLocked(bytes32 indexed orderId);
    // event FundsReleased(bytes32 indexed orderId, address indexed seller, uint256 amount);
    // event FundsRefunded(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    // event DisputeOpened(bytes32 indexed orderId);
    // event event DisputeResolved(bytes32 indexed orderId, address indexed winner, uint256 amount);
}