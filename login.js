async function loginToWabix(email, password) {
    try {
        // First, get the CSRF token and cookies
        const initialResponse = await fetch('https://wabix.io/login', {
            method: 'GET',
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'en-US,en;q=0.9',
                'authorization': 'Basic d2FiaXg6d2FiaXg=',
                'cache-control': 'max-age=0',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
            }
        });

        if (!initialResponse.ok) {
            throw new Error(`Initial request failed: ${initialResponse.status}`);
        }

        // Get cookies from the response
        const setCookieHeader = initialResponse.headers.get('set-cookie');
        const cookies = setCookieHeader ? parseCookies(setCookieHeader) : {};

        // Extract CSRF token from the response
        const html = await initialResponse.text();
        const csrfToken = extractCsrfToken(html);

        if (!csrfToken) {
            throw new Error('Could not extract CSRF token from the login page');
        }

        // Now perform the actual login with the credentials
        const loginResponse = await fetch('https://wabix.io/login', {
            method: 'POST',
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'en-US,en;q=0.9',
                'authorization': 'Basic d2FiaXg6d2FiaXg=',
                'cache-control': 'max-age=0',
                'content-type': 'application/x-www-form-urlencoded',
                'origin': 'https://wabix.io',
                'referer': 'https://wabix.io/login',
                'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                'Cookie': formatCookiesForHeader(cookies)
            },
            body: new URLSearchParams({
                '_token': csrfToken,
                'email': email,
                'password': password
            }),
            redirect: 'manual' // Don't follow redirects automatically
        });

        // Check for redirect (which usually indicates successful login)
        if (loginResponse.status === 302) {
            const location = loginResponse.headers.get('location');
            console.log(loginResponse)
            console.log('Redirected to:', location);

            // Get updated cookies
            const newCookies = loginResponse.headers.get('set-cookie');
            if (newCookies) {
                const updatedCookies = {
                    ...cookies,
                    ...parseCookies(newCookies)
                };

                // Follow the redirect to get to the dashboard
                const dashboardResponse = await fetch(new URL(location, 'https://wabix.io').href, {
                    headers: {
                        'Cookie': formatCookiesForHeader(updatedCookies),
                        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
                    }
                });

                const dashboardHtml = await dashboardResponse.text();

                // Look for Bearer token in the dashboard HTML
                const tokenMatch = dashboardHtml.match(/token['"]\s*:\s*['"]([^'"]+)['"]/i);
                if (tokenMatch && tokenMatch[1]) {
                    return `Bearer ${tokenMatch[1]}`;
                }

                // If no token found but we got to the dashboard, we're likely logged in
                // Return the cookies which can be used for authenticated requests
                return {
                    cookies: updatedCookies
                };
            }
        }

        // If we didn't get a redirect or proper response
        if (!loginResponse.ok) {
            const responseText = await loginResponse.text();
            if (responseText.includes('These credentials do not match our records')) {
                throw new Error('Invalid credentials');
            }
            throw new Error(`Login failed: ${loginResponse.status}`);
        }

        // If we reached here without returning, we couldn't find the token
        console.warn('Login seemed successful but no token was found');
        return null;
    } catch (error) {
        console.error('Error during login:', error);
        throw error;
    }
}

// Helper function to extract CSRF token from HTML
function extractCsrfToken(html) {
    const tokenMatch = html.match(/<input[^>]*name="_token"[^>]*value="([^"]*)"[^>]*>/i);
    return tokenMatch ? tokenMatch[1] : null;
}

// Helper function to parse Set-Cookie header
function parseCookies(setCookieHeader) {
    const cookies = {};
    if (!setCookieHeader) return cookies;

    // If it's an array, join it
    const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader.join(', ') : setCookieHeader;

    cookieString.split(', ').forEach(cookie => {
        const parts = cookie.split(';')[0].trim().split('=');
        if (parts.length >= 2) {
            const name = parts[0];
            const value = parts.slice(1).join('=');
            cookies[name] = value;
        }
    });

    return cookies;
}

// Helper function to format cookies for header
function formatCookiesForHeader(cookies) {
    return Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
}

export {
    loginToWabix
};