# Firebase Authentication Setup Guide

This app now uses Firebase Authentication for secure admin login. Follow these steps to set it up:

## 1. Enable Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** in the left sidebar
4. Click **Get Started**
5. Enable **Email/Password** sign-in method:
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"

## 2. Create Admin Users

### Option A: Create users in Firebase Console
1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Enter email and password for each admin
4. Click **Add user**

### Option B: Create users programmatically
You can create admin users using the Firebase Console or through your app's registration flow (if you add one).

## 3. Set Admin Permissions

You have two options to designate admin users:

### Option 1: Environment Variable (Recommended for small teams)
Add to your `.env.local` file:
```
VITE_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

### Option 2: Firestore Database (Recommended for scalability)
Create a `users` collection in Firestore with documents like:
```
users/{userId}
  - role: "admin"
  - isAdmin: true
  - email: "admin@example.com"
```

The app checks both methods - if either matches, the user is granted admin access.

## 4. Firestore Security Rules (Required)

**IMPORTANT**: Security rules have been created in `firestore.rules`. You need to deploy them to Firebase.

### Option A: Deploy via Firebase CLI (Recommended)

1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your Firebase project
   - Use the existing `firestore.rules` file

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Option B: Copy Rules Manually in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **Publish**

### What the Rules Do

The security rules enforce your three-tier permission system:

- **Guests** (not logged in): Can only read data (view leaderboard, active races, persons)
- **Users** (logged in): Can create persons, races, and results. Can only delete their own races/results.
- **Admins**: Can do everything, including deleting any person, race, or result.

**Note**: Without these rules deployed, your Firestore database will use default rules (deny all reads/writes), which will break your application!

## 5. Environment Variables

Make sure your `.env.local` file includes all Firebase config variables:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

## 6. Testing

1. Start your development server: `npm run dev`
2. Try logging in with a non-admin email - you should see the login form but won't have admin access
3. Log in with an admin email - you should see admin controls
4. Check the browser console for any authentication errors

## Security Notes

- **Never commit `.env.local`** to version control
- Use strong passwords for admin accounts
- Consider enabling 2FA for admin accounts in Firebase
- Regularly review your Firestore security rules
- Monitor authentication logs in Firebase Console

## Troubleshooting

- **"No account found"**: Create the user in Firebase Console first
- **"Incorrect password"**: Reset password in Firebase Console or use "Forgot password" flow
- **Admin status not working**: Check that the email is in `VITE_ADMIN_EMAILS` or the user document has `role: "admin"` in Firestore
- **Authentication errors**: Check browser console and Firebase Console → Authentication → Users for details

