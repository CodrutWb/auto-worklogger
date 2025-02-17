import {
  loginToWabix
} from './login.js';
import {
  fetchWorklogs,
  submitNewWorklog
} from './worklogs.js';
import express from 'express';
import cron from 'node-cron';
const email = 'codrut.dica@webitfactory.io';
const password = 'webit';
const startDate = getTodayDate()
const endDate = getTodayDate()
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', async (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Auto Worklogger</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #007bff; }
        </style>
      </head>
      <body>
        <h1>Welcome to Auto Worklogger!</h1>
        <p>This Node.js app is running successfully.</p>
      </body>
    </html>
  `);
});

async function submitWorklog() {

  try {
    let cookies = await loginToWabix(email, password);
    if (!cookies) {
      console.log("Simple login didn't yield a token, trying complete login flow...");
    }

    const worklogs = await fetchWorklogs(cookies.cookies['XSRF-TOKEN'], cookies.cookies.laravel_session, startDate, endDate);

    if (worklogs.recordsTotal > 0) return; //If worklogs were manually added already, do not add new ones.
    submitNewWorklog(cookies.cookies['XSRF-TOKEN'], cookies.cookies.laravel_session, startDate)

  } catch (error) {
    console.error("Error in worklog submission:", error);
  }
}

cron.schedule('0 23 * * 1-5', submitWorklog); // This will run Mon-Fri at 11 PM


function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0]; // Formats as YYYY-MM-DD
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
