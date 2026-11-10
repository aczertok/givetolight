# Launch checklist

The Lighthouse Project's campaign site. It starts empty: no campaigns, no donations, no ambassadors.
You create each campaign from the admin, and it lives at its own address, for example `yourdomain.com/volley2027`.

Money goes through **Stripe** (cards, Apple Pay, Google Pay, bank transfer, monthly) and **Chariot**
(OJC, The Donors' Fund, Matbia, Fidelity and other DAFs). Logins and data are in **Supabase**. The site runs on **Vercel**.
All four have free tiers that cover a site this size; Stripe and Chariot take their usual per-donation fees.

## 1. Domain
Buy the domain you want (`givelight.com` is already taken; `givetolight.com` was available on Nov 10, 2026).
Buying it at vercel.com/domains is simplest, because the site runs there and it connects itself.

## 2. Database and logins (Supabase, ~5 minutes)
1. supabase.com → New project. Region: US East. Save the database password somewhere safe.
2. SQL Editor → New query → paste all of `supabase/migrations/0001_init.sql` → Run. You should see "Success".
3. Authentication → URL Configuration:
   - Site URL: `https://YOURDOMAIN`
   - Redirect URLs: `https://YOURDOMAIN/auth/callback` and `https://*.vercel.app/auth/callback`
4. Authentication → Emails → SMTP Settings: connect a sending service (for example Resend, free) so sign-in emails
   come from your domain. Supabase's built-in sender is limited to a few emails an hour, which is fine for testing only.
5. Project Settings → API: you'll copy the Project URL, the `anon` key and the `service_role` key into Vercel.
   The service_role key is a master key: paste it only into Vercel.

## 3. Payments
**Stripe**
- Settings → Payment methods: turn on Cards, Apple Pay, Google Pay and ACH Direct Debit.
- Settings → Customer emails: turn on receipts for successful payments.
- Developers → API keys: copy the Secret key into Vercel.
- Developers → Webhooks → Add endpoint `https://YOURDOMAIN/api/stripe/webhook`, events:
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
  `invoice.paid`, `charge.refunded`. Copy its Signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`.

**Chariot**
- From your Chariot dashboard: the Connect ID (CID) and an API token.
- Ask Chariot support: "Which API token do we use to create grants from our own website, and does it expire?"
- Until these are set, the DAF button simply doesn't appear.

## 4. Hosting (Vercel, ~5 minutes)
1. vercel.com → Add New → Project → import the `givetolight` GitHub repository.
2. Environment Variables: add every name in `.env.example`:
   - `NEXT_PUBLIC_SITE_URL` = `https://YOURDOMAIN`
   - `NEXT_PUBLIC_SITE_NAME` = the name in the header, e.g. `Give to Light`
   - `ADMIN_EMAILS` = your email (and other staff, comma-separated)
   - the Supabase, Stripe and Chariot values from steps 2–3
3. Deploy. Then Settings → Domains → add your domain and `www.` version.

## 5. First login and launch
1. Go to `YOURDOMAIN/login`, enter your email, open the link. Because your email is in `ADMIN_EMAILS`,
   you're staff automatically: an **Admin** link appears.
2. Admin → Campaigns → **New campaign**: name, web address (e.g. `volley2027`), goal, dates, match, suggested amounts,
   cover photo. Leave it as **Draft** while you set it up; drafts are invisible to the public.
3. Add teams on the campaign page.
4. Test: set it **Live**, give $1 with a real card, check Admin → Donations, then refund it in Stripe.
5. Share `YOURDOMAIN/volley2027` and invite ambassadors to `YOURDOMAIN/ambassador`.

## Day to day
- **New campaign any time:** Admin → Campaigns → New campaign. It goes public at its address when set to Live.
- **Ambassadors** sign up themselves at `/ambassador`; approve them under Admin → Ambassadors
  (or turn approval off per campaign).
- **Checks and cash:** Admin → Donations → "Add a check, cash or other offline gift".
- **All donations:** Admin → Donations, with search, filters and CSV download.
- **Past donors and texting:** Admin → Import (CauseMatch/Charidy CSVs), then Admin → Outreach.
- **More staff:** add their email to `ADMIN_EMAILS` in Vercel and redeploy, or in Supabase SQL Editor run
  `insert into admins (user_id) select id from auth.users where email = 'their@email.com';` after they log in once.

## Notes
- Matching is displayed from each campaign's match settings; the matchers' money is collected separately.
- "Split monthly" counts the full pledge when the donor signs up; Stripe charges monthly and stops after the last payment.
- Imported history never shows publicly; it powers Outreach only.
- Donor emails and phones are never public. Visitors can only read the public views, and the database rules
  were tested: visitors can't see emails, drafts, pending ambassadors or imported gifts; ambassadors see only their own donors.
