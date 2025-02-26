import * as cheerio from "cheerio";
import fs from 'fs';

const description = 'review and assign tasks, team sync, manage client and providers communication, assist on specific matters that need technical intervention on db (investigate users or bets / export reports for accounting / make adjustments to balances as per Moneytree team requirements / others)'
const LOG_FILE = 'lastWorklog.json';
function saveLastWorklogTime(error = '') {
    console.log("Saving last worklog date.");
    const timestamp = new Date().toISOString();
    fs.writeFileSync(LOG_FILE, JSON.stringify({ lastWorklog: timestamp, error }, null, 2));
}

async function fetchWorklogs(xsrfToken, laravelSession, startDate, endDate) {
    console.log("Fetching today's worklogs.");
    const url =
        `https://wabix.io/worklogs?draw=8&columns%5B0%5D%5Bdata%5D=DT_RowIndex&columns%5B0%5D%5Bname%5D=No&columns%5B0%5D%5Bsearchable%5D=false&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=hours&columns%5B1%5D%5Bname%5D=hours&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=employee&columns%5B2%5D%5Bname%5D=employee_id&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=22&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=project&columns%5B3%5D%5Bname%5D=project_id&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=worklog_type&columns%5B4%5D%5Bname%5D=worklog_type&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=true&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=description&columns%5B5%5D%5Bname%5D=description&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=date&columns%5B6%5D%5Bname%5D=date&columns%5B6%5D%5Bsearchable%5D=false&columns%5B6%5D%5Borderable%5D=true&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=${startDate}%3A%3A${endDate}&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B7%5D%5Bdata%5D=action&columns%5B7%5D%5Bname%5D=action&columns%5B7%5D%5Bsearchable%5D=true&columns%5B7%5D%5Borderable%5D=false&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false&start=0&length=100&search%5Bvalue%5D=&search%5Bregex%5D=false&_=1739538576397`;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Accept-Language": "en-US,en;q=0.9",
                "Authorization": "Basic d2FiaXg6d2FiaXg=", // Base64 encoded username:password
                "X-XSRF-TOKEN": xsrfToken, // CSRF token
                "X-Requested-With": "XMLHttpRequest",
                "Referer": "https://wabix.io/worklogs",
                "Sec-Ch-Ua": `"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"`,
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": `"macOS"`,
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
                "Cookie": `XSRF-TOKEN=${xsrfToken}; laravel_session=${laravelSession}`, // Manually set cookies
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

async function getCsrfToken(xsrfToken, laravelSession) {
    const response = await fetch("https://wabix.io/worklogs/create", {
        headers: {
            "Authorization": "Basic d2FiaXg6d2FiaXg=", // Use your credentials
            "Cookie": `XSRF-TOKEN=${xsrfToken}; laravel_session=${laravelSession}`,
            "User-Agent": "Mozilla/5.0",
        },
    });

    const html = await response.text();
    const match = html.match(/name="_token" value="(.+?)"/); // Find _token in HTML
    return [match ? match[1] : null, html];
}

async function getEmployeeId(html) {
    const $ = cheerio.load(html);
    const employeeOption = $('select[name="employee_id"] option:contains("Codrut Dica")');
    return employeeOption.attr("value");
}

async function getProjectId(html) {
    const $ = cheerio.load(html);
    const employeeOption = $('select[name="project_id"] option:contains("Royal Stakes")');
    return employeeOption.attr("value");
}

async function submitNewWorklog(xsrfToken, laravelSession, date) {
    const [csrfToken, html] = await getCsrfToken(xsrfToken, laravelSession);
    const employeeId = await getEmployeeId(html)
    const projectId = await getProjectId(html);


    const formData = new URLSearchParams();
    formData.append("_token", csrfToken);
    formData.append("hours", "8");
    formData.append("employee_id", employeeId);
    formData.append("date", date); // Dynamically set today's date
    formData.append("description", description);
    formData.append("project_id", projectId);
    formData.append("worklog_type", "administrative");

    try {
    console.log("Worklog data is set, calling wabix.")
        const response = await fetch("https://wabix.io/worklogs", {
            method: "POST",
            headers: {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Authorization": "Basic d2FiaXg6d2FiaXg=", // Keep as-is if required
                "Cache-Control": "max-age=0",
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "https://wabix.io",
                "Referer": "https://wabix.io/worklogs/create",
                "X-Requested-With": "XMLHttpRequest",
                "X-XSRF-TOKEN": xsrfToken, // Include XSRF Token
                "Cookie": `XSRF-TOKEN=${xsrfToken}; laravel_session=${laravelSession}`,
            },
            body: formData.toString(), // Convert form data to URL-encoded string
        });

        if (!response.ok) {
            saveLastWorklogTime(`HTTP Error: ${response.status}`);
            throw new Error(`HTTP Error: ${response.status}`)
        };
        saveLastWorklogTime();
        const data = await response.text(); // Expecting HTML response
    } catch (error) {
        console.error("Submission Error:", error);
    }
}



export {
    fetchWorklogs,
    submitNewWorklog,
    LOG_FILE
};