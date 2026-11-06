# Give to Light — going live

The Lighthouse Project's campaign site. Each campaign lives at `givetolight.com/<address>`.
Money goes through **Stripe** (cards, Apple Pay, Google Pay, bank transfer, monthly) and **Chariot**
(OJC, The Donors' Fund, Matbia, Fidelity and other DAFs). The database and logins are **Supabase**.
The site runs on **Vercel**.

## 1. Database (Supabase, ~5 minutes)
1. supabase.com → New project (name it `givetolight`, pick a strong database password, region US East).
2. SQL Editor → New query → paste all of `supabase/migrations/0001_init.sql` → Run.
3. Authentication → URL Configuration: Site URL `https://givetolight.com`; add `https://givetolight.com/auth/callback`
   and `https://*.vercel.app/auth/callback` to Redirect URLs.
4. Project Settings → API: you'll need the Project URL, the `anon` key and the `service_role` key in step 3.
   The service_role key is a master key: paste it only into Vercel, never into chat or email.

## 2. Payments
**Stripe** (you already have an account):
- Settings → Payment methods: turn on Cards, Apple Pay, Google Pay, and ACH Direct Debit.
- Settings → Customer emails: turn on "Successful payments" so donors get receipts.
- Developers → API keys: the Secret key goes into Vercel in step 3.
- Developers → Webhooks → Add endpoint: `https://givetolight.com/api/stripe/webhook` with events
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `invoice.paid`, `charge.refunded`.
  Copy its Signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`.

**Chariot** (you already have an account):
- From the Chariot dashboard, get your **Connect ID (CID)** and an **API access token**.
  Ask Chariot support which token to use for "Create Grant" from your own website and whether it expires.
- Put them in Vercel as `NEXT_PUBLIC_CHARIOT_CID` and `CHARIOT_API_KEY`.
- Until these are set, the donate page simply hides the DAF option.

## 3. Hosting (Vercel, ~5 minutes)
1. vercel.com → Add New → Project → import the `givetolight` GitHub repository.
2. Environment Variables: add every name from `.env.example` with its value. Set
   `NEXT_PUBLIC_SITE_URL` to `https://givetolight.com`.
3. Deploy. Then Settings → Domains → add `givetolight.com` (and `www.givetolight.com`).
   If you bought the domain at Vercel, it connects itself; otherwise follow Vercel's DNS instructions.

## 4. Make yourself an admin
1. Go to `givetolight.com/login`, enter your email, open the link.
2. In Supabase → SQL Editor, run:
   `insert into admins (user_id) select id from auth.users where email = 'YOUR@EMAIL';`
3. Reload the site: an **Admin** link appears. Add other staff the same way after they log in once.

## 5. Load your history, then launch
1. Admin → Campaigns → New campaign, once for each past campaign (status **Ended**, uncheck "Show on the home page"
   if you don't want past campaigns listed).
2. Admin → Import: upload each Charidy CSV into its campaign. Totals are checked against the file.
3. Create Hike 2027 / Volleyball 2027 (status **Draft**), add teams, cover photo, goal and match.
4. Test: make a $1 donation with a real card, check it appears in Admin → Donations, then refund it in Stripe.
5. Set the campaign to **Live**, and invite past ambassadors from Admin → Outreach → Past ambassadors.

## Day to day
- **New campaign:** Admin → Campaigns → New campaign. Its address is live as soon as the status is Live.
- **Ambassadors:** they sign up at `givetolight.com/ambassador`; approve them under Admin → Ambassadors.
- **Checks and cash:** Admin → Donations → "Add a check, cash or other offline gift".
- **Every donation:** Admin → Donations (filter, search, download CSV).
- **Texting:** Admin → Outreach. Tap Text on a phone to open your messages with the note filled in, or download the list for a bulk texting service.

## Notes
- Matching is shown on the site from the campaign's match settings; matcher money is collected separately.
- "Split monthly" counts the full pledge when the donor signs up; Stripe charges it monthly and stops after the last payment.
- Imported history is never shown publicly; it powers Outreach only.
- Donor emails and phones are never public: visitors only read the `*_public` views.
