# WhatsApp entry point — setup

The bot itself is live at `https://www.mizan-price.com/api/whatsapp` (see `api/whatsapp.js`).
It answers "ac service in al qusais 300" with the same two-layer, honestly-labelled verdict as
the site, and records "paid 250 for ac service in al qusais" as an anonymous submission.
What it needs from you is the Meta side: a WhatsApp Business number wired to that webhook.
Takes ~15 minutes with a Facebook account; free to test.

## 1. Create the Meta app

1. Go to https://developers.facebook.com → **My Apps → Create App**.
2. Type: **Business**. Name it e.g. `Mizan`.
3. In the app dashboard, find **WhatsApp** and click **Set up**. Create (or pick) a Meta
   Business portfolio when asked.

You now have a **test phone number** that can message up to 5 verified recipient numbers —
enough to try the whole loop before committing a real number.

## 2. Collect the two values

On **WhatsApp → API Setup** in the app dashboard:

- **Phone number ID** (a long number under the test number dropdown) → `WHATSAPP_PHONE_ID`
- **Temporary access token** (valid 24h; fine for the first test) → `WHATSAPP_TOKEN`

## 3. Set the Vercel env vars

Vercel → project `mizan` → Settings → Environment Variables (Production):

| Name | Value |
|---|---|
| `WHATSAPP_TOKEN` | the access token from step 2 |
| `WHATSAPP_PHONE_ID` | the phone number ID from step 2 |
| `WHATSAPP_VERIFY_TOKEN` | any random string you invent — you'll paste the same one into Meta in step 4 |

Redeploy (Deployments → ⋯ → Redeploy) so the function picks them up.

## 4. Point the webhook at the bot

App dashboard → **WhatsApp → Configuration**:

1. **Callback URL**: `https://www.mizan-price.com/api/whatsapp`
2. **Verify token**: the exact `WHATSAPP_VERIFY_TOKEN` string from step 3.
3. Click **Verify and save** — Meta calls the endpoint with a GET handshake; it should turn green.
4. Under **Webhook fields**, subscribe to **messages** (only that field is needed).

## 5. Test it

1. On the API Setup page, add your own phone as a recipient (**To** dropdown → Manage phone
   number list) — Meta sends you a code on WhatsApp to confirm.
2. From your phone, message the test number:
   - `hi` → help text
   - `ac service in al qusais 300` → verdict (STEEP, with the honest estimate label)
   - `paid 250 for ac service in al qusais` → records it + thanks + comparison
3. If nothing comes back: Vercel → project → Logs, filter `/api/whatsapp` — send failures and
   parse errors are logged there.

## 6. Going live (when ready for real users)

- **Permanent token**: the 24h token dies quietly. Business settings → Users → **System users**
  → create one (admin), generate a token with `whatsapp_business_messaging` +
  `whatsapp_business_management` permissions, no expiry. Replace `WHATSAPP_TOKEN` in Vercel.
- **Real number**: WhatsApp → API Setup → **Add phone number**. The number must NOT be
  registered on consumer WhatsApp (a fresh SIM / virtual number works). Verify by SMS/call.
  Replace `WHATSAPP_PHONE_ID` with the new number's ID.
- **Business verification** (Meta Business Manager → Security Centre) lifts the messaging
  limits; without it you can still message ~250 unique users/day, which is plenty at launch.
- **Advertise it**: add a `wa.me/<number>` "Ask on WhatsApp" link to the site footers and the
  outreach messages (docs/outreach.md). Pre-filled example:
  `https://wa.me/<number>?text=ac%20service%20in%20al%20qusais`

## Notes

- **Privacy**: the sender's number is never stored. Submissions carry a one-way SHA-256 hash
  shaped as the anonymous `device` UUID — same anti-pump rate limits as the web app, and it's
  how the bot remembers that a phone already contributed (the reciprocity unlock).
- **Prereq for that memory**: the `device` column comes from the `docs/backend-setup.md` §5
  SQL, which hasn't been run yet (as of Sep 2026). Until it runs, the bot still works — it
  just can't remember contributors between messages (the paid range shows in the reply to a
  contribution), and inserts silently drop the device id.
- **Data**: the bot reads `api/bot-data.json`, generated from `index.html` by
  `node tools/build-bot-data.mjs`. Rerun after changing CATEGORIES/AREA_GROUPS.
- **Graph version**: pinned in `api/whatsapp.js` (`v23.0`), override with
  `WHATSAPP_GRAPH_VERSION` env var when Meta retires it — no code change needed.
- UAE services only for now (the launch focus). Rent/motor/US queries get the help text with
  a link to the right app.
