export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;
  private readonly _brand = "FirestorePermissionError";

  constructor(context: SecurityRuleContext) {
    const message = `Firestore Permission Denied: The following request was denied by Firestore Security Rules:\n${JSON.stringify(
      context,
      null,
      2
    )}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}

export function isFirestorePermissionError(
  e: any
): e is FirestorePermissionError {
  return (
    typeof e === 'object' && e !== null && e._brand === 'FirestorePermissionError'
  );
}
