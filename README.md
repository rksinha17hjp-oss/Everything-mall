# Everything Mall — Starter

Responsive React + Vite storefront starter with optional Supabase authentication and database catalogue.

## Included
- Responsive homepage and category browsing
- Search and category filters
- Product cards and product details
- Sign up, sign in, sign out, password reset
- Supabase catalogue query with local demo fallback
- Supabase SQL schema with Row Level Security
- No real payments, delivery, or AI actions yet (not implemented)

## 1. Create the GitHub repository
Create a new public repository named `everything-mall` on GitHub. Upload the files in this project, including the `src` folder and `supabase/schema.sql`.

## 2. Set up Supabase
1. Create a Supabase project.
2. Open SQL Editor and run all of `supabase/schema.sql`.
3. In Project Settings / API, copy the Project URL and publishable/anon key.
4. In Authentication URL configuration, set Site URL to your deployed GitHub Pages URL.
5. Add the same URL to Redirect URLs, e.g. `https://YOUR-USERNAME.github.io/everything-mall/`.
6. In `src/lib/supabase.js`, replace the two placeholder strings with your Project URL and publishable/anon key. The publishable/anon key is designed for browser use only when RLS is correctly configured. NEVER use a service_role/secret key in frontend code.
7. If email confirmation is enabled, sign-up may require confirming the email before login.

## 3. GitHub Pages deployment
1. Update `base` in `vite.config.js` to `'/YOUR-REPOSITORY-NAME/'` (keep the leading and trailing slash).
2. In the repository, go to Settings → Pages.
3. Choose GitHub Actions as the build/deployment source.
4. Add `.github/workflows/deploy.yml` (included).
5. Commit changes. Check Actions for a successful deployment.
6. Open `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/`.

## 4. Important GitHub mobile limitation
GitHub Pages cannot securely store private backend secrets. The Supabase publishable/anon key is okay in the frontend only because database tables use RLS. Keep service-role keys, payment secrets, and AI provider secrets on a trusted server only.

## 5. Testing
- Homepage and demo products should render even before Supabase is configured.
- Configure Supabase, run the SQL, then reload. Catalogue data should load from Supabase.
- Test sign up, email confirmation (if enabled), sign in, and sign out.
- Test from a second browser/account that users cannot insert or change product records.
- Check browser console and GitHub Actions if something fails.

## Current scope
The catalogue and auth are the starter milestone. Cart is a browser-session demo only and is not saved as an order. Checkout/payment, seller dashboard writes, AI, and live tracking are not implemented yet.
