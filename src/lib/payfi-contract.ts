/** Contract mapping for the frontend mock. Real requests must go through a server:
 * the partner API secret/HMAC signature must never be sent to the browser.
 */
import type { ExchangeOrder } from "./mvp";
import type { Deposit } from "./deposit-mvp";
export const payfiEndpoints = {
  merchant: "GET /api/v1/merchants/detail",
  balance: "GET /api/v1/accounts/balance",
  fee: "POST /api/v1/fees/query",
  paymentCreate: "POST /api/v1/payments",
  paymentDetail: "GET /api/v1/payments/detail",
  paymentList: "GET /api/v1/payments/list",
  paymentClose: "POST /api/v1/payments/close",
  payeeList: "GET /api/v1/payees/list",
  merchantCreate: "POST /api/v1/merchants",
  kycUpload: "POST /api/v1/merchants/kyc/files",
  kycSubmit: "POST /api/v1/merchants/kyc",
  payeeTemplates: "GET /api/v1/payees/templates",
  payeeUpload: "POST /api/v1/files",
  payeeCreate: "POST /api/v1/payees",
  payeeUpdate: "POST /api/v1/payees/update",
  quote: "POST /api/v1/settlements/query-rate",
  confirm: "POST /api/v1/settlements/confirm",
  settlementDetail: "GET /api/v1/settlements/detail",
  settlementList: "GET /api/v1/settlements/list",
} as const;
export const paymentRequest = (merchantNo: string, d: Deposit) => ({
  merchant_no: merchantNo,
  order_sn: d.sn,
  amount: d.amount,
  coin: d.coin,
  network: d.network,
});
export const quoteRequest = (merchantNo: string, q: ExchangeOrder) => ({
  merchant_no: merchantNo,
  settlement_sn: q.sn,
  sell_amount: q.amount,
  sell_coin: q.coin,
  receive_coin: "USD",
  payee_no: q.payeeNo,
});
export const confirmationRequest = (q: ExchangeOrder) => ({
  settlement_order_no: q.id,
  action: "CONFIRM",
  order_type: q.orderType,
  purpose: q.purpose,
});
export const cancellationRequest = (q: ExchangeOrder) => ({
  settlement_order_no: q.id,
  action: "CANCEL",
});
