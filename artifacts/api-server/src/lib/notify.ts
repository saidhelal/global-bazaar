import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "./email";

export interface NotificationPayload {
  type: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  link?: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
  userEmail?: string;
  userFullName?: string;
}

export async function createNotification(userId: number, payload: NotificationPayload): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      userId,
      type: payload.type,
      title: payload.title,
      titleAr: payload.titleAr,
      message: payload.message,
      messageAr: payload.messageAr,
      link: payload.link,
      metadata: payload.metadata,
      isRead: false,
    });

    if (payload.sendEmail && payload.userEmail) {
      await sendEmail({
        to: payload.userEmail,
        toName: payload.userFullName,
        subject: payload.title,
        subjectAr: payload.titleAr,
        body: payload.message,
        bodyAr: payload.messageAr,
        link: payload.link,
      }).catch(() => {});
    }
  } catch (err) {
    console.error("[notify] Failed to create notification:", err);
  }
}

export async function notifyAdmins(payload: Omit<NotificationPayload, "userEmail" | "userFullName">): Promise<void> {
  try {
    const admins = await db
      .select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"));

    await Promise.all(
      admins.map(admin =>
        createNotification(admin.id, {
          ...payload,
          sendEmail: true,
          userEmail: admin.email,
          userFullName: admin.fullName,
        })
      )
    );
  } catch (err) {
    console.error("[notify] Failed to notify admins:", err);
  }
}

export async function notifyUser(
  userId: number,
  email: string,
  fullName: string,
  payload: Omit<NotificationPayload, "userEmail" | "userFullName">
): Promise<void> {
  return createNotification(userId, {
    ...payload,
    sendEmail: true,
    userEmail: email,
    userFullName: fullName,
  });
}
