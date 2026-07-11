import type { FastifyBaseLogger } from "fastify";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env.js";

let transporter: Transporter | null = null;

function hasSmtpConfiguration() {
  if (!env.smtpHost || !env.mailFrom) return false;
  return Boolean(env.smtpUser) === Boolean(env.smtpPass);
}

export function passwordResetDeliveryReady() {
  try {
    const publicUrl = new URL(env.publicAppUrl);
    if (process.env.NODE_ENV === "production" && publicUrl.protocol !== "https:") {
      return false;
    }
  } catch {
    return false;
  }
  return (
    hasSmtpConfiguration() ||
    (process.env.NODE_ENV !== "production" && env.passwordResetLogLinks)
  );
}

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    requireTLS: !env.smtpSecure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: env.smtpUser
      ? {
          user: env.smtpUser,
          pass: env.smtpPass,
        }
      : undefined,
  });
  return transporter;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function sendPasswordResetEmail(input: {
  email: string;
  resetUrl: string;
  logger: FastifyBaseLogger;
}) {
  if (!hasSmtpConfiguration()) {
    if (process.env.NODE_ENV === "production" || !env.passwordResetLogLinks) {
      throw new Error("Password reset email is not configured");
    }
    input.logger.info({ resetUrl: input.resetUrl }, "Development password reset link");
    return;
  }

  const safeUrl = escapeHtml(input.resetUrl);
  await getTransporter().sendMail({
    from: env.mailFrom,
    to: input.email,
    subject: "篮球俱乐部 - 重置密码",
    text: [
      "我们收到了你的密码重置申请。",
      "",
      `请在 ${env.passwordResetTtlMinutes} 分钟内打开以下链接并设置新密码：`,
      input.resetUrl,
      "",
      "如果不是你本人操作，请忽略此邮件。",
      "",
      "We received a request to reset your password.",
      `This link expires in ${env.passwordResetTtlMinutes} minutes. If you did not request it, you can ignore this email.`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,'PingFang SC',sans-serif;line-height:1.65;color:#102319;max-width:560px;margin:auto">
        <div style="border-top:6px solid #3ddc55;padding:24px 4px">
          <h1 style="font-size:24px;margin:0 0 14px">重置 Greenfighter 账户密码</h1>
          <p>我们收到了你的密码重置申请。请在 ${env.passwordResetTtlMinutes} 分钟内设置新密码。</p>
          <p style="margin:24px 0"><a href="${safeUrl}" style="display:inline-block;background:#3ddc55;color:#061109;padding:12px 20px;text-decoration:none;font-weight:700;border-radius:6px">设置新密码</a></p>
          <p style="color:#54705b;font-size:14px">如果不是你本人操作，请忽略此邮件。</p>
          <hr style="border:0;border-top:1px solid #dce8df;margin:24px 0">
          <p style="color:#54705b;font-size:14px">We received a request to reset your password. This link expires in ${env.passwordResetTtlMinutes} minutes.</p>
        </div>
      </div>
    `,
  });
}
