import {
  loginToWabix
} from './login.js';
import {
  fetchWorklogs,
  submitNewWorklog,
  LOG_FILE
} from './worklogs.js';
import express from 'express';
import cron from 'node-cron';
import fs from 'fs';

const email = 'codrut.dica@webitfactory.io';
const password = 'webit';
const startDate = getTodayDate()
const endDate = getTodayDate()
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', async (req, res) => {
  const lastWorklog = getLastWorklogTime();
  res.send(`<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Auto Worklogger</title>
      <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Arial', sans-serif; }
          body {
              background: linear-gradient(135deg, #1e3c72, #2a5298);
              height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
              animation: fadeIn 1s ease-in-out;
          }
          .container {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              padding: 30px;
              border-radius: 15px;
              text-align: center;
              width: 400px;
              color: #fff;
              box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
              transform: translateY(-20px);
              animation: slideIn 0.8s ease-out forwards;
          }
          h1 { font-size: 26px; margin-bottom: 10px; }
          p { font-size: 16px; opacity: 0.9; }
          .btn {
              margin-top: 20px;
              display: inline-block;
              padding: 10px 20px;
              font-size: 16px;
              color: #fff;
              background: rgba(255, 255, 255, 0.2);
              border: none;
              border-radius: 10px;
              cursor: pointer;
              transition: all 0.3s ease-in-out;
          }
          .btn:hover {
              background: rgba(255, 255, 255, 0.4);
              transform: scale(1.05);
          }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      </style>
  </head>
  <body>
      <div class="container">
          <h1>🚀 Auto Worklogger</h1>
          <p>Your automated work logs are running smoothly!</p>
          <p>Last worklog: <strong>${lastWorklog}</strong></p>
      </div>
  </body>
  </html>`);
});

function getLastWorklogTime() {
  if (fs.existsSync(LOG_FILE)) {
      const data = fs.readFileSync(LOG_FILE, 'utf8');
      const parsedData = JSON.parse(data);

      if (!parsedData.lastWorklog) {
          return "No worklog submitted yet.";
      }

      const date = new Date(parsedData.lastWorklog);

      // Format date to GMT+2 (hh:mm dd/mm/yyyy)
      const formattedDate = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/Bucharest', // GMT+2 (Romania timezone)
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
      }).format(date);

      return `${formattedDate} UTC+2 ${parsedData.error || ''}`.trim();
  }
  return "No worklog submitted yet.";
}

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

function scheduleCron() {
  try {
    console.log("Initializing cronjob!");
    cron.schedule('17 16 * *  1-5', submitWorklog); // This will run Mon-Fri at 11 PM
    console.log("Cronjob initialized successfully!")
  }
  catch(e) {
    console.error(e)
  }
};

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0]; // Formats as YYYY-MM-DD
}

scheduleCron(); 

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
