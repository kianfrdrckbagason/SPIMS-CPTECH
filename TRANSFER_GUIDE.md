# SPIMS-CPTECH Transfer Guide

Follow these steps to move the project to another laptop without losing your data.

## 1. Copy the project folder
Copy the full Projects folder to your external drive.

This should include:
- SPIMS-CPTECH/client
- SPIMS-CPTECH/server
- SPIMS-CPTECH/Phase 2 – Authentication.txt

## 2. Copy the database backup
The backup folder is already created at:
- SPIMS-CPTECH/server/mongo-backup

Copy that folder as well.

## 3. Install MongoDB on the new laptop
Make sure MongoDB is installed and running locally.

If MongoDB is not installed yet, install it first.

## 4. Install Node.js on the new laptop
Make sure Node.js is installed.

## 5. Restore the database
Open a terminal in the server folder and run:

```bash
node restore-db.mjs
```

This will restore the backup into your local MongoDB database.

## 6. Install dependencies
In the client folder:

```bash
npm install
```

In the server folder:

```bash
npm install
```

## 7. Start the app
Start the backend:

```bash
cd server
npm start
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

## 8. Log in
Use:
- Email: admin@cptech.com
- Password: Admin@1234

## Notes
- Keep the .env file from the server folder. It contains your database connection settings.
- If the new laptop uses a different MongoDB setup, update the MONGO_URI value in the .env file.
- If you want, you can also copy the backup folder into the new laptop before restoring.
