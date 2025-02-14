import { loginToWabix } from './login.js';
import { fetchWorklogs, submitNewWorklog } from './worklogs.js';
const email = 'codrut.dica@webitfactory.io';
const password = 'webit';
const startDate = getTodayDate()
const endDate = getTodayDate()
async function main() {
    try {
        let cookies = await loginToWabix(email, password);
        if (!cookies) {
            console.log("Simple login didn't yield a token, trying complete login flow...");
          }

        const worklogs = await fetchWorklogs(cookies.cookies['XSRF-TOKEN'], cookies.cookies.laravel_session, startDate, endDate);

        if(worklogs.recordsTotal > 0) return; //If worklogs were manually added already, do not add new ones.
        submitNewWorklog(cookies.cookies['XSRF-TOKEN'], cookies.cookies.laravel_session, startDate)

    }
    catch (error) {
        console.error("Error in worklog submission:", error);
    }

}

function getTodayDate() {
    const today = new Date();
    return today.toISOString().split("T")[0]; // Formats as YYYY-MM-DD
  }
  
  

main();


