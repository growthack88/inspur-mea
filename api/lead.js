// Lead capture: receives the consult form POST and emails it via Resend.
// Env: RESEND_API_KEY (required), LEAD_TO (default readcastlive@gmail.com)
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const b = req.body || {};
  // honeypot: pretend success for bots
  if (b._honey) return res.redirect(303, '/thanks');

  const name = String(b.name || '').trim().slice(0, 200);
  const email = String(b.email || '').trim().slice(0, 200);
  if (!name || !/.+@.+\..+/.test(email)) return res.status(400).send('Please provide your name and a valid email.');

  const esc = s => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const rows = [
    ['Name', name], ['Email', email], ['Company', b.company],
    ['Country', b.country], ['Need', b.need], ['Resource', b.resource],
  ].filter(r => r[1]);
  const html = `<h2>New lead — inspurmea.com</h2>
<table cellpadding="8" style="border-collapse:collapse;border:1px solid #ddd">
${rows.map(([k, v]) => `<tr><td style="border:1px solid #ddd"><b>${k}</b></td><td style="border:1px solid #ddd">${esc(v)}</td></tr>`).join('\n')}
</table>`;
  const subject = b.resource
    ? `Resource request: ${String(b.resource).slice(0, 120)} — inspurmea.com`
    : 'New consultation request — inspurmea.com';

  const to = process.env.LEAD_TO || 'readcastlive@gmail.com';
  const send = from => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], reply_to: email, subject, html }),
  });

  // primary: branded domain; fallback covers the window before Resend verifies it
  let r = await send('Inspur MEA <hi@inspurmea.com>');
  if (!r.ok) r = await send('Inspur MEA <onboarding@resend.dev>');
  if (!r.ok) return res.status(502).send('Could not send your request right now — please email hi@inspurmea.com directly.');

  res.redirect(303, '/thanks');
};
