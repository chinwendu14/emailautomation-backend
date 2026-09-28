//

import { google } from "googleapis";
import { getGmailAuthClient } from "./gmailToken.service.js";

interface SendGmailEmailParams {
  userId: string;
  emailAccountId: string;
  to: string;
  subject: string;
  body: string;
}

const createRawEmail = (
  from: string,
  to: string,
  subject: string,
  body: string,
): string => {
  const email = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");

  return Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const sendGmailEmail = async ({
  userId,
  emailAccountId,
  to,
  subject,
  body,
}: SendGmailEmailParams) => {
  // Get the Gmail OAuth client and make sure
  // the account belongs to the logged-in user.
  const { oauth2Client, emailAccount } = await getGmailAuthClient(
    emailAccountId,
    userId,
  );

  const gmail = google.gmail({
    version: "v1",
    auth: oauth2Client,
  });

  // Create the Gmail raw email.
  const raw = createRawEmail(emailAccount.email, to, subject, body);

  // Send the email through Gmail.
  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
    },
  });

  return {
    messageId: response.data.id,
    threadId: response.data.threadId,
  };
};
