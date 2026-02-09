// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// A standard interface for ERC20 tokens.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title USDTEscrow
 * @dev This contract holds USDT funds for a transaction between a buyer and a seller.
 * An arbiter can resolve disputes. A fee is taken on successful release of funds.
 */
contract USDTEscrow {
    // Enum to represent the various states an order can be in.
    enum OrderState { Empty, Created, Locked, Released, Disputed, Refunded }

    // Struct to hold all information about an order.
    struct Order {
        address buyer;
        address seller;
        uint256 amount;
        OrderState state;
    }

    // State variables
    address public arbiter;           // The address that can resolve disputes.
    IERC20 public usdtToken;           // The USDT token contract instance.
    uint256 public feePercentageBps;  // The fee taken by the arbiter, in basis points (1% = 100).
    
    // Mapping from a unique order ID to the Order struct.
    mapping(bytes32 => Order) public orders;

    // Events to log significant actions on the blockchain.
    event OrderCreated(bytes32 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event OrderLocked(bytes32 indexed orderId);
    event FundsReleased(bytes32 indexed orderId, address indexed seller, uint256 amount);
    event FundsRefunded(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event DisputeOpened(bytes32 indexed orderId);
    event DisputeResolved(bytes32 indexed orderId, address indexed winner, uint256 amount);

    // Modifiers to restrict access to functions.
    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Only arbiter can call this function");
        _;
    }

    modifier onlyBuyer(bytes32 orderId) {
        require(msg.sender == orders[orderId].buyer, "Only buyer can call this function");
        _;
    }
    
    modifier onlySeller(bytes32 orderId) {
        require(msg.sender == orders[orderId].seller, "Only seller can call this function");
        _;
    }

    /**
     * @dev Sets the initial arbiter, USDT token address, and fee percentage.
     * @param _arbiter The address of the arbiter.
     * @param _usdtTokenAddress The address of the USDT token contract.
     * @param _feePercentageBps The fee in basis points (e.g., 250 for 2.5%).
     */
    constructor(address _arbiter, address _usdtTokenAddress, uint256 _feePercentageBps) {
        arbiter = _arbiter;
        usdtToken = IERC20(_usdtTokenAddress);
        feePercentageBps = _feePercentageBps;
    }

    /**
     * @dev Creates a new order. Typically called by a backend service.
     * @param orderId A unique ID for the order.
     * @param buyer The buyer's address.
     * @param seller The seller's address.
     * @param amount The amount of USDT for the transaction.
     */
    function createOrder(bytes32 orderId, address buyer, address seller, uint256 amount) external {
        require(orders[orderId].state == OrderState.Empty, "Order already exists");
        require(amount > 0, "Amount must be greater than 0");

        orders[orderId] = Order(buyer, seller, amount, OrderState.Created);
        
        emit OrderCreated(orderId, buyer, seller, amount);
    }

    /**
     * @dev Called by the buyer to lock their funds in the contract.
     * The buyer must have pre-approved the contract to spend their USDT.
     * @param orderId The ID of the order.
     */
    function lockFunds(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(msg.sender == order.buyer, "Only buyer can lock funds");
        require(order.state == OrderState.Created, "Order not in created state");

        uint256 totalAmount = order.amount;
        require(usdtToken.transferFrom(msg.sender, address(this), totalAmount), "USDT transfer failed");

        order.state = OrderState.Locked;
        emit OrderLocked(orderId);
    }

    /**
     * @dev Called by the buyer to confirm they have received the item.
     * This triggers the release of funds to the seller.
     * @param orderId The ID of the order.
     */
    function confirmDelivery(bytes32 orderId) external onlyBuyer(orderId) {
        Order storage order = orders[orderId];
        require(order.state == OrderState.Locked, "Order not in locked state");

        releaseFunds(orderId);
    }
    
    /**
     * @dev Called by the buyer or seller to open a dispute.
     * @param orderId The ID of the order.
     */
    function openDispute(bytes32 orderId) external {
         Order storage order = orders[orderId];
         require(msg.sender == order.buyer || msg.sender == order.seller, "Only buyer or seller can open a dispute");
         require(order.state == OrderState.Locked, "Can only dispute a locked order");

         order.state = OrderState.Disputed;
         emit DisputeOpened(orderId);
    }

    /**
     * @dev Called by the arbiter to resolve a dispute.
     * @param orderId The ID of the disputed order.
     * @param releaseToSeller True to release funds to the seller, false to refund the buyer.
     */
    function resolveDispute(bytes32 orderId, bool releaseToSeller) external onlyArbiter {
        Order storage order = orders[orderId];
        require(order.state == OrderState.Disputed, "Order is not in dispute");

        if (releaseToSeller) {
            releaseFunds(orderId);
        } else {
            refundFunds(orderId);
        }
    }

    /**
     * @dev Internal function to release funds to the seller and send fee to arbiter.
     */
    function releaseFunds(bytes32 orderId) private {
        Order storage order = orders[orderId];
        uint256 fee = (order.amount * feePercentageBps) / 10000;
        uint256 sellerAmount = order.amount - fee;

        order.state = OrderState.Released;
        
        require(usdtToken.transfer(order.seller, sellerAmount), "Seller transfer failed");
        if (fee > 0) {
            require(usdtToken.transfer(arbiter, fee), "Fee transfer failed");
        }

        emit FundsReleased(orderId, order.seller, sellerAmount);
    }

    /**
     * @dev Internal function to refund the full amount to the buyer.
     */
    function refundFunds(bytes32 orderId) private {
        Order storage order = orders[orderId];
        uint256 refundAmount = order.amount;

        order.state = OrderState.Refunded;
        require(usdtToken.transfer(order.buyer, refundAmount), "Buyer refund failed");

        emit FundsRefunded(orderId, order.buyer, refundAmount);
    }
}

    