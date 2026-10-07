const MAILPIT = 'http://localhost:8025/api/v1';

interface MailSummary {
  ID: string;
  To: Array<{ Address: string }>;
  Subject: string;
}

export async function clearMail(): Promise<void> {
  await fetch(`${MAILPIT}/messages`, { method: 'DELETE' });
}

export async function listMail(): Promise<MailSummary[]> {
  const res = await fetch(`${MAILPIT}/messages`);
  const body = (await res.json()) as { messages: MailSummary[] };
  return body.messages;
}

// Waits briefly because reset emails are sent after the HTTP response.
export async function latestMailTo(
  email: string,
  timeoutMs = 3000,
): Promise<{ subject: string; text: string } | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = (await listMail()).find((m) =>
      m.To.some((to) => to.Address.toLowerCase() === email.toLowerCase()),
    );
    if (found) {
      const res = await fetch(`${MAILPIT}/message/${found.ID}`);
      const msg = (await res.json()) as { Subject: string; Text: string };
      return { subject: msg.Subject, text: msg.Text };
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return undefined;
}
