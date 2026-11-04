# NewsIntel AI

NewsIntel AI is a two-site news portal built with independent React + Vite applications. The public customer site and private editorial console use the same Firebase Authentication project and Firestore database. Firebase is the only backend. There is no API server, Cloud Function, Firebase Storage, or image upload feature.

## Architecture

```text
apps/customer  Public reader website (newsintelai.com)
apps/admin     Editorial dashboard (admin.newsintelai.com)
firebase/      Firestore security rules and indexes
```

Both clients read Firebase web configuration from the repository root `.env`. The config is public client configuration; Firestore Rules provide the authorization boundary. The admin UI checks `users/{uid}.role`, and the same role is independently enforced by Firestore Rules.

## Stack

React, Vite, JavaScript, React Router, Tailwind CSS v4, Lucide React, Firebase Authentication, Cloud Firestore, Firebase Hosting, npm workspaces.

## Requirements and installation

- Node.js 20.19+ or 22.12+ and npm
- A Firebase project on the Spark plan
- Firebase CLI (`npm install -g firebase-tools`)

Install dependencies from the repository root:

```sh
npm install
```

Copy the root environment template to `.env` and enter the Firebase web app config:

```sh
cp .env.example .env
```

The customer and admin Vite apps both read the repository root `.env`. The required Firebase client values are `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`. The storage bucket, messaging sender ID, and measurement ID are optional unless you add those Firebase services. In Firebase Console, open Project settings → General → Your apps to copy the Web App config. These client config values are visible to site visitors by design; never put service account keys or private secrets in a Vite variable.

## Firebase setup

1. Create a Firebase project. Select Spark (no billing account is required for this implementation).
2. In **Authentication → Sign-in method**, enable **Email/Password** and **Google** (choose a support email for Google). In **Authentication → Settings → Authorized domains**, ensure `localhost` and the customer site's domain are listed; add any custom customer domain you use.
3. Create a **Cloud Firestore** database in production mode. Choose a region near your readers; the region cannot be changed later.
4. Register a Firebase Web App and copy its client config into the root `.env` file.
5. Set the project ID in `.firebaserc` in place of `YOUR_FIREBASE_PROJECT_ID`. Do not commit populated `.env` files.
6. Deploy the database rules and indexes:

   ```sh
   firebase login
   firebase use YOUR_FIREBASE_PROJECT_ID
   firebase deploy --only firestore:rules,firestore:indexes
   ```

The initial database collections are created when the first records are written. The rules deny unknown collections and fields. Public visitors can read only published news, active categories, and the public settings document. A signed-in reader can create and read only their own verification request. Administrators manage news, categories, reviews, public settings, and reader profiles. A user cannot grant themselves the admin role.

### First administrator bootstrap

There is intentionally no public admin registration flow.

1. In **Authentication → Users**, add the first administrator using email/password (or register with email/password on the customer site). The admin portal currently uses email/password sign-in.
2. Copy that user's Firebase Auth UID.
3. In **Firestore → Data**, create `users/{UID}` with fields: `uid` (string, same UID), `displayName` (string), `email` (string, same account email), `role` (string, `admin`), `status` (string, `active`), `createdAt` (timestamp), `updatedAt` (timestamp).
4. Sign in at the admin site's URL. The dashboard and Firestore Rules both check the profile role.

Treat this Console action as privileged. Do not create admin profiles through the browser client.

## Local development

From the repository root, double-click `start-local.bat` to open both development servers, or run each app in a separate terminal:

```sh
npm run dev:customer
npm run dev:admin
```

The batch file uses `http://localhost:5173` for the customer portal and `http://localhost:5174` for the admin portal. Stop each server by closing its terminal window.

Each app can also be built independently:

```sh
npm run build:customer
npm run build:admin
```

When Firebase variables are absent, the pages still render, but authentication and database features remain unavailable. The customer homepage shows an empty newsroom state until real articles have been published.

## Using the customer portal

The customer portal is the public reading site. Visitors can browse the homepage and latest stories, open active categories, and search published headlines, summaries, categories, and tags. Search covers the stories currently loaded by the app, not the entire Firestore archive.

After deployment, the current Firebase Hosting URLs are [customer portal](https://newsintel-ai.web.app) and [admin portal](https://admin-newsintel.web.app). Custom domains can be used if configured in Firebase Hosting.

### Create an account or sign in

1. Choose **Sign in** in the site navigation.
2. Sign in with email and password, or choose **Continue with Google**. New email accounts can be created from **Create an account**; Google sign-in can create an account on its first use.
3. On a user's first successful sign-in, the app creates `users/{uid}` with the user's UID, display name, email, `role: customer`, `status: active`, and creation/update timestamps. Existing profiles and roles are left intact.
4. Open **My account** to view your account and verification submissions, or sign out.

Email/Password and Google providers must be enabled in Firebase Authentication. Add `localhost` and the deployed customer domain to Authentication's authorized domains. Firestore rules must also be deployed for profile creation and reading to work.

### Submit a claim for review

1. Sign in, then open **Verify News**.
2. Enter a headline and the claim to review (at least 20 characters). A source URL and additional context are optional; source links must use HTTPS.
3. Choose **Send for review**. The submission is stored privately with status `pending` and result `unverified`.
4. Return to **My account** to see your submissions and their current status.

Submitting a claim does not produce an automatic fact-check or a verdict. A newsroom reviewer evaluates it.

## Using the admin portal

The admin portal is a separate site and is for newsroom staff. Sign in with the email/password account associated with an active Firestore admin profile. The Google button is only available on the customer portal; there is no public admin registration flow.

An admin profile must be at `users/{Firebase Auth UID}` with `role: admin` and `status: active`. To grant or remove the admin role, use Firebase Console; users cannot grant themselves that role from either site. If a page shows a permissions error, verify the document is in the plural `users` collection, its document ID exactly matches the Authentication UID, and the repository's Firestore rules have been deployed to the same Firebase project.

### Dashboard and newsroom

- **Overview** summarizes story counts, published stories, drafts, pending verification requests, readers, and active categories. Use **New story** or the quick actions to start newsroom work.
- **Newsroom** lists stories. Search by headline or category, filter by published, draft, or archived status, then use the edit or delete controls.
- **New story** requires a headline, short description, and article content. The slug is generated from the headline and can be edited. Choose a category, add a byline and comma-separated tags, and optionally mark the story featured or breaking.
- In the **Publish** panel, choose **Save as draft**, **Publish now**, or **Archive**. Published stories become visible on the customer portal; drafts and archived stories are not public.
- Cover images must be hosted elsewhere. Paste an HTTPS image URL to preview it; direct uploads are not supported.

### Categories, verification, readers, and settings

- **Categories** lets admins add and edit topic names, slugs, descriptions, and active status. Inactive categories are hidden from readers. A category already used by a story cannot be deleted; deactivate it instead.
- **Verification** lists customer submissions. Open **Review** to set the workflow status, choose an editorial assessment, add notes, and enter evidence URLs (one per line). Save the review when finished. Assessments are human editorial judgments, not guarantees of truth.
- **Readers** lists user profiles and lets admins suspend or reactivate an account. Role changes are reserved for Firebase Console setup.
- **Settings** saves publication name, description, contact email, logo URL, and social links to the Firestore `settings/public` document. A logo URL must use HTTPS. These values are stored by the admin form; the customer portal does not currently read them into its page layout.

## Data and editorial workflow

Firestore collections are `users`, `news`, `categories`, `verificationRequests`, `activityLogs`, and `settings`. Published article documents carry a category snapshot, URL slug, author/byline, tags, and publication timestamps. The included indexes support published latest-news queries and a reader's dated verification-submission list. Firestore may request additional indexes if you extend query combinations; follow its generated console link and commit the resulting index to `firebase/firestore.indexes.json`.

Search is intentionally a basic client-side match over the currently loaded published stories and their titles, summaries, categories, and tags. Firestore does not provide general full-text search. The customer app caps the fetched news set; use categories or latest-news browsing for larger archives.

### Images

No image uploads exist. Admins paste an HTTPS image URL into the story form; the app validates its scheme, previews it, and stores only the URL string. Customer cards use a local visual fallback when an image is empty or fails to load. Use image URLs you have permission to publish and that allow embedding. Logos can be selected as local app assets or entered as an HTTPS URL in settings.

### Verification limitations

The submission and newsroom review flow is human-led. Reviewers can record a status, an editorial assessment (`likely_true`, `likely_false`, `misleading`, or `unverified`), notes, and evidence links. These assessments are not guarantees of truth. No AI model or paid API is called, and there is no secret client-side AI key. A secure AI integration would require a separate review of available Firebase products, plan limits, data handling, and security before implementation.

## Firebase Hosting multi-site setup

Both Hosting sites live in the same Firebase project but have independent builds and deploy targets.

1. In Firebase Console **Hosting**, add two sites. Choose site IDs (for example `newsintel-customer` and `newsintel-admin`).
2. Replace the two placeholders in `.firebaserc` with your project ID and those exact Hosting site IDs. The target names `customer` and `admin` are already used by scripts.
3. Confirm `firebase.json` points customer at `apps/customer/dist` and admin at `apps/admin/dist` and includes the SPA rewrite.
4. Add each custom domain in its Hosting site's **Add custom domain** flow. Follow the verification and DNS records Firebase shows for that domain. DNS records depend on your registrar and Firebase's current verification instructions; do not guess them. Wait for DNS/SSL provisioning.
5. Add `newsintelai.com` and `admin.newsintelai.com` to Firebase Auth's authorized domains.
6. Deploy separately:

   ```sh
   npm run deploy:customer
   npm run deploy:admin
   ```

Each deploy command builds only that app and deploys only its Hosting target. To publish Firestore rules/index changes, run the Firestore deploy command above separately. Firebase Spark includes free Hosting, Auth, and Firestore quotas, but quotas and terms can change; monitor Firebase Console usage. This app does not require billing-enabled products.

## Security notes

- Frontend route protection improves navigation but is not the security boundary. Firestore Rules enforce role checks on every protected data operation.
- Customer signup creates only a `customer` profile. Profile updates cannot change the role, email, or status.
- Customer rules expose published stories and active categories only.
- Never add service account credentials to either Vite app.
- Do not deploy the placeholder `.firebaserc` values; replace them first.

