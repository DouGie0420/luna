import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'orders@luna.gift';
const SITE_NAME = 'LUNA';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://luna.gift';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = await req.json();
    const {
      sellerEmail,
      sellerName,
      buyerName,
      productName,
      orderId,
      totalAmount,
      txHash,
    } = body;

    const emails = [];

    if (sellerEmail) {
      emails.push(
        resend.emails.send({
          from: `${SITE_NAME} Orders <${FROM_EMAIL}>`,
          to: sellerEmail,
          subject: `🛍️ 你有一笔新订单 — ${productName}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);border-radius:16px;padding:12px 24px;">
        <span style="color:#fff;font-size:22px;font-weight:900;letter-spacing:2px;">LUNA</span>
      </div>
    </div>

    <div style="background:#0d0715;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
      <div style="height:3px;background:linear-gradient(90deg,#7c3aed,#db2777);"></div>

      <div style="padding:32px;">
        <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px;">🎉 恭喜！你的商品已售出</h1>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 28px;">买家已完成付款，资金已锁入托管合约，请尽快安排发货。</p>

        <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:16px;margin-bottom:20px;">
          <p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">商品</p>
          <p style="color:#fff;font-size:16px;font-weight:700;margin:0;">${productName}</p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">
            <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px;">买家</p>
            <p style="color:#fff;font-size:14px;font-weight:700;margin:0;">${buyerName || '匿名买家'}</p>
          </div>
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">
            <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px;">订单号</p>
            <p style="color:#fff;font-size:12px;font-weight:700;font-family:monospace;margin:0;word-break:break-all;">${orderId}</p>
          </div>
        </div>

        <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:rgba(255,255,255,0.5);font-size:14px;">成交金额</span>
          <span style="color:#34d399;font-size:20px;font-weight:900;">${totalAmount} ETH</span>
        </div>

        ${txHash && txHash !== 'N/A' ? `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px;margin-bottom:24px;">
          <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 6px;">链上交易哈希</p>
          <p style="color:rgba(255,255,255,0.6);font-size:11px;font-family:monospace;margin:0;word-break:break-all;">${txHash}</p>
        </div>
        ` : ''}

        <a href="${SITE_URL}/account/sales" style="display:block;text-align:center;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 24px;border-radius:12px;letter-spacing:0.5px;">
          查看订单并安排发货 →
        </a>
      </div>
    </div>

    <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin-top:24px;">
      LUNA Marketplace · 自动发送，请勿回复
    </p>
  </div>
</body>
</html>
          `,
        })
      );
    }

    if (emails.length > 0) {
      await Promise.allSettled(emails);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Order email send error:', error);
    return NextResponse.json({ ok: true, error: error.message });
  }
}
