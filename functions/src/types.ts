// G:\Luna Website\functions\src\types.ts
import { Contract, ContractTransactionResponse } from 'ethers';

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
    // event DisputeResolved(bytes32 indexed orderId, address indexed winner, uint256 amount);
}

/**
 * LunaEscrow 合约接口（实际部署的 ETH 托管合约）
 * orderId 为 uint256（Firebase ID 经 ethers.toBigInt(ethers.id(id)) 转换而来）
 */
export interface LunaEscrow extends Contract {
    // Read
    orders(orderId: bigint): Promise<{
        amount: bigint;
        deliveryTimestamp: bigint;
        buyer: string;
        seller: string;
        status: number; // enum Status { AWAITING_DELIVERY, COMPLETE, DISPUTED, REFUNDED, ... }
    }>;
    owner(): Promise<string>;

    // Write
    createOrder(
        orderId: bigint,
        seller: string,
        options?: { value: bigint }
    ): Promise<ContractTransactionResponse>;

    raiseDispute(
        orderId: bigint
    ): Promise<ContractTransactionResponse>;

    resolveDispute(
        orderId: bigint,
        refundToBuyer: boolean
    ): Promise<ContractTransactionResponse>;

    confirmReceipt(
        orderId: bigint
    ): Promise<ContractTransactionResponse>;
}