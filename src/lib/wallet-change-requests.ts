import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
  type Firestore,
} from "firebase/firestore";

type WalletChangeStatus = "pending" | "approved" | "rejected";

export interface WalletChangeRequestRecord {
  id: string;
  userId: string;
  userName?: string;
  oldWalletAddress: string;
  newWalletAddress: string;
  status: WalletChangeStatus;
  source: "auto_switch" | "manual";
  reason?: string;
  createdAt?: any;
  reviewerId?: string | null;
  reviewedAt?: any;
  rejectionReason?: string | null;
  approvedAt?: any;
}

export interface WalletChangeEligibility {
  hasPending: boolean;
  approvedThisMonth: number;
  pendingRequestId?: string;
}

export interface WalletChangeSubmitResult {
  ok: boolean;
  code:
    | "created"
    | "pending_exists"
    | "monthly_limit_reached"
    | "same_wallet"
    | "invalid_wallet";
  message: string;
  requestId?: string;
  approvedThisMonth?: number;
  pendingRequestId?: string;
}

function toDateSafe(value: any): Date | null {
  if (!value) return null;
  if (value?.toDate && typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isInMonth(target: Date, now: Date): boolean {
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth()
  );
}

export async function getWalletChangeEligibility(
  firestore: Firestore,
  userId: string,
  now: Date = new Date(),
): Promise<WalletChangeEligibility> {
  const docs = await getDocs(
    query(collection(firestore, "walletChangeRequests"), where("userId", "==", userId)),
  );

  let hasPending = false;
  let pendingRequestId: string | undefined;
  let approvedThisMonth = 0;

  docs.forEach((docSnap) => {
    const data = docSnap.data() as WalletChangeRequestRecord;
    if (data.status === "pending") {
      hasPending = true;
      if (!pendingRequestId) pendingRequestId = docSnap.id;
    }
    if (data.status === "approved") {
      const approvedAt = toDateSafe(data.approvedAt) || toDateSafe(data.reviewedAt);
      if (approvedAt && isInMonth(approvedAt, now)) {
        approvedThisMonth += 1;
      }
    }
  });

  return { hasPending, approvedThisMonth, pendingRequestId };
}

export async function submitWalletChangeRequest(params: {
  firestore: Firestore;
  userId: string;
  userName?: string;
  oldWalletAddress: string;
  newWalletAddress: string;
  source?: "auto_switch" | "manual";
  reason?: string;
  monthlyApprovedLimit?: number;
}): Promise<WalletChangeSubmitResult> {
  const {
    firestore,
    userId,
    userName,
    oldWalletAddress,
    newWalletAddress,
    source = "manual",
    reason,
    monthlyApprovedLimit = 2,
  } = params;

  const oldAddress = (oldWalletAddress || "").trim().toLowerCase();
  const newAddress = (newWalletAddress || "").trim().toLowerCase();

  if (!newAddress || !newAddress.startsWith("0x") || newAddress.length < 10) {
    return {
      ok: false,
      code: "invalid_wallet",
      message: "Invalid wallet address.",
    };
  }

  if (oldAddress && oldAddress === newAddress) {
    return {
      ok: false,
      code: "same_wallet",
      message: "New wallet is the same as the currently bound wallet.",
    };
  }

  const eligibility = await getWalletChangeEligibility(firestore, userId);

  if (eligibility.hasPending) {
    return {
      ok: false,
      code: "pending_exists",
      message: "A wallet change request is already pending review.",
      pendingRequestId: eligibility.pendingRequestId,
      approvedThisMonth: eligibility.approvedThisMonth,
    };
  }

  if (eligibility.approvedThisMonth >= monthlyApprovedLimit) {
    return {
      ok: false,
      code: "monthly_limit_reached",
      message: `Monthly approved wallet change limit (${monthlyApprovedLimit}) reached.`,
      approvedThisMonth: eligibility.approvedThisMonth,
    };
  }

  const docRef = await addDoc(collection(firestore, "walletChangeRequests"), {
    userId,
    userName: userName || "User",
    oldWalletAddress: oldAddress,
    newWalletAddress: newAddress,
    status: "pending",
    source,
    reason: reason || (source === "auto_switch" ? "Auto request from wallet switch." : ""),
    createdAt: serverTimestamp(),
    reviewerId: null,
    reviewedAt: null,
    rejectionReason: null,
    approvedAt: null,
  });

  return {
    ok: true,
    code: "created",
    message: "Wallet change request created.",
    requestId: docRef.id,
    approvedThisMonth: eligibility.approvedThisMonth,
  };
}
