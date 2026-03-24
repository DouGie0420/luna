import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'bookings@luna.gift';
const SITE_NAME = 'LUNA';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://luna.gift';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      // Silently skip if not configured — don't break the booking flow
      return NextResponse.json({ ok: true, skipped: true });
    }

    const body = await req.json();
    const {
      type, // 'new_booking' | 'booking_confirmed' | 'booking_cancelled' | 'booking_completed'
      hostEmail,
      hostName,
      tenantEmail,
      tenantName,
      propertyName,
      propertyId,
      bookingId,
      checkIn,
      checkOut,
      nights,
      guests,
      totalPrice,
    } = body;

    const emails = [];

    if (type === 'new_booking') {
      // Email to HOST: new booking request
      if (hostEmail) {
        emails.push(
          resend.emails.send({
            from: `${SITE_NAME} Bookings <${FROM_EMAIL}>`,
            to: hostEmail,
            subject: `📬 新预订请求 — ${propertyName}`,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);border-radius:16px;padding:12px 24px;">
        <span style="color:#fff;font-size:22px;font-weight:900;letter-spacing:2px;">LUNA</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#0d0715;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
      <!-- Top accent -->
      <div style="height:3px;background:linear-gradient(90deg,#7c3aed,#db2777);"></div>

      <div style="padding:32px;">
        <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px;">你有一个新的预订请求！</h1>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 28px;">请登录 LUNA 查看详情并确认预订。</p>

        <!-- Property -->
        <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:16px;margin-bottom:20px;">
          <p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">房源</p>
          <p style="color:#fff;font-size:16px;font-weight:700;margin:0;">${propertyName}</p>
        </div>

        <!-- Details grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">
            <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px;">入住</p>
            <p style="color:#fff;font-size:14px;font-weight:700;margin:0;">${checkIn}</p>
          </div>
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">
            <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px;">退房</p>
            <p style="color:#fff;font-size:14px;font-weight:700;margin:0;">${checkOut}</p>
          </div>
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">
            <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px;">入住天数</p>
            <p style="color:#fff;font-size:14px;font-weight:700;margin:0;">${nights} 晚</p>
          </div>
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">
            <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px;">人数</p>
            <p style="color:#fff;font-size:14px;font-weight:700;margin:0;">${guests} 人</p>
          </div>
        </div>

        <!-- Price -->
        <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:rgba(255,255,255,0.5);font-size:14px;">预计总收入</span>
          <span style="color:#34d399;font-size:20px;font-weight:900;">฿${Number(totalPrice).toLocaleString()}</span>
        </div>

        <!-- Guest info -->
        <div style="margin-bottom:28px;">
          <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">房客</p>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">${tenantName || '未知房客'}</p>
          ${tenantEmail ? `<p style="color:rgba(255,255,255,0.4);font-size:12px;font-family:monospace;margin:4px 0 0;">${tenantEmail}</p>` : ''}
        </div>

        <!-- CTA Button -->
        <a href="${SITE_URL}/account/host-bookings" style="display:block;text-align:center;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 24px;border-radius:12px;letter-spacing:0.5px;">
          查看并确认预订 →
        </a>
      </div>
    </div>

    <!-- Footer -->
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

      // Email to TENANT: booking request sent
      if (tenantEmail) {
        emails.push(
          resend.emails.send({
            from: `${SITE_NAME} Bookings <${FROM_EMAIL}>`,
            to: tenantEmail,
            subject: `✅ 预订请求已发送 — ${propertyName}`,
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
        <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px;">预订请求已发送</h1>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 28px;">房东收到请求后将确认预订，我们会第一时间通知你。</p>

        <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:16px;margin-bottom:20px;">
          <p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">房源</p>
          <p style="color:#fff;font-size:16px;font-weight:700;margin:0;">${propertyName}</p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">
            <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px;">入住</p>
            <p style="color:#fff;font-size:14px;font-weight:700;margin:0;">${checkIn}</p>
          </div>
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">
            <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px;">退房</p>
            <p style="color:#fff;font-size:14px;font-weight:700;margin:0;">${checkOut}</p>
          </div>
        </div>

        <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:16px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:rgba(255,255,255,0.5);font-size:14px;">总金额</span>
          <span style="color:#34d399;font-size:20px;font-weight:900;">฿${Number(totalPrice).toLocaleString()}</span>
        </div>

        <a href="${SITE_URL}/account/bookings" style="display:block;text-align:center;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 24px;border-radius:12px;letter-spacing:0.5px;">
          查看我的预订 →
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
    }

    if (type === 'booking_confirmed') {
      if (tenantEmail) {
        emails.push(
          resend.emails.send({
            from: `${SITE_NAME} Bookings <${FROM_EMAIL}>`,
            to: tenantEmail,
            subject: `🎉 预订已确认 — ${propertyName}`,
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
      <div style="height:3px;background:linear-gradient(90deg,#059669,#10b981);"></div>
      <div style="padding:32px;">
        <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px;">🎉 你的预订已确认！</h1>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 28px;">房东已接受你的预订，期待你的入住！</p>
        <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:16px;margin-bottom:20px;">
          <p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">房源</p>
          <p style="color:#fff;font-size:16px;font-weight:700;margin:0;">${propertyName}</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">
            <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px;">入住</p>
            <p style="color:#fff;font-size:14px;font-weight:700;margin:0;">${checkIn}</p>
          </div>
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">
            <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px;">退房</p>
            <p style="color:#fff;font-size:14px;font-weight:700;margin:0;">${checkOut}</p>
          </div>
        </div>
        <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:rgba(255,255,255,0.5);font-size:14px;">总金额</span>
          <span style="color:#34d399;font-size:20px;font-weight:900;">฿${Number(totalPrice).toLocaleString()}</span>
        </div>
        <a href="${SITE_URL}/account/bookings" style="display:block;text-align:center;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 24px;border-radius:12px;letter-spacing:0.5px;">
          查看预订详情 →
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
    }

    if (type === 'booking_cancelled') {
      if (tenantEmail) {
        emails.push(
          resend.emails.send({
            from: `${SITE_NAME} Bookings <${FROM_EMAIL}>`,
            to: tenantEmail,
            subject: `❌ 预订未通过 — ${propertyName}`,
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
      <div style="height:3px;background:linear-gradient(90deg,#6b7280,#9ca3af);"></div>
      <div style="padding:32px;">
        <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px;">很遗憾，此次预订未通过</h1>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 28px;">房东因档期原因无法接受此次预订，你可以继续浏览其他房源。</p>
        <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">被拒绝的房源</p>
          <p style="color:#fff;font-size:16px;font-weight:700;margin:0;">${propertyName}</p>
          <p style="color:rgba(255,255,255,0.35);font-size:12px;font-family:monospace;margin:6px 0 0;">${checkIn} → ${checkOut}</p>
        </div>
        <a href="${SITE_URL}/products/rental/all" style="display:block;text-align:center;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 24px;border-radius:12px;letter-spacing:0.5px;">
          浏览更多房源 →
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
    }

    if (emails.length > 0) {
      await Promise.allSettled(emails);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Email send error:', error);
    // Don't fail the booking — just log
    return NextResponse.json({ ok: true, error: error.message });
  }
}
