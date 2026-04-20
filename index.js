const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ USER SESSIONS & LEADS ============
const userSessions = {};
const leadsDatabase = [];

// ============ CREATE WHATSAPP CLIENT ============
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// ============ QR CODE GENERATION ============
client.on('qr', (qr) => {
    console.log('\n📱 Scan this QR code with your WhatsApp:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n👉 Open WhatsApp → Settings → Linked Devices → Link a Device\n');
});

// ============ BOT READY ============
client.on('ready', () => {
    console.log('\n✅ Bot is ready! 🚀');
    console.log('📊 View leads at: http://localhost:3000/leads\n');
});

// ============ AUTH SUCCESS ============
client.on('authenticated', () => {
    console.log('✅ Authentication successful!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Auth failed:', msg);
});

client.on('disconnected', (reason) => {
    console.log('❌ Disconnected:', reason);
});

// ============ VALIDATION ============
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^[0-9]{10}$/.test(phone.replace(/\D/g, ''));
}

// ============ MAIN MESSAGE HANDLER ============
client.on('message', async (message) => {
    // Ignore status and group messages
    if (message.from === 'status@broadcast') return;
    if (message.from.includes('@g.us')) return;

    const from = message.from;
    const msg = message.body.trim();
    const msgLower = msg.toLowerCase();

    console.log(`📩 From ${from}: ${msg}`);

    // Initialize session
    if (!userSessions[from]) {
        userSessions[from] = {
            stage: 'greeting',
            data: {
                name: '',
                phone: '',
                email: '',
                education: '',
                experience: ''
            }
        };
    }

    const session = userSessions[from];

    // Reset command
    if (msgLower === 'reset' || msgLower === 'restart') {
        delete userSessions[from];
        await message.reply("🔄 Chat reset ho gaya! Type *Hi* to start again.");
        return;
    }

    // ============ STAGE: GREETING ============
    if (session.stage === 'greeting') {
        await message.reply(
`🌍 *Welcome to Go Global Immigration Services!* 🌍

Hello! 👋 I'm your virtual assistant.

Main aapki visa aur immigration related queries solve karne me help karunga.

But pehle mujhe aapki kuch basic details chahiye taaki hum aapko better guide kar sakein. ✨

Shall we start? Type *"yes"* to continue 👍`);
        session.stage = 'ask_start';
        return;
    }

    // ============ STAGE: CONFIRM START ============
    if (session.stage === 'ask_start') {
        if (['yes', 'y', 'ok', 'haan', 'ha'].includes(msgLower)) {
            await message.reply("👤 *Step 1/5*\n\nPlease enter your *Full Name*:");
            session.stage = 'ask_name';
        } else {
            await message.reply("Please type *yes* to continue or *reset* to start over.");
        }
        return;
    }

    // ============ STAGE: NAME ============
    if (session.stage === 'ask_name') {
        if (msg.length < 2) {
            await message.reply("❌ Please enter a valid name (min 2 characters)");
            return;
        }
        session.data.name = msg;
        await message.reply(
`Great, *${msg}*! 😊

📱 *Step 2/5*

Please enter your *Phone Number* (10 digits):`);
        session.stage = 'ask_phone';
        return;
    }

    // ============ STAGE: PHONE ============
    if (session.stage === 'ask_phone') {
        if (!isValidPhone(msg)) {
            await message.reply("❌ Please enter a valid 10-digit phone number.\n\nExample: 9876543210");
            return;
        }
        session.data.phone = msg;
        await message.reply(
`✅ Phone saved!

📧 *Step 3/5*

Please enter your *Email Address*:`);
        session.stage = 'ask_email';
        return;
    }

    // ============ STAGE: EMAIL ============
    if (session.stage === 'ask_email') {
        if (!isValidEmail(msg)) {
            await message.reply("❌ Please enter a valid email address.\n\nExample: yourname@gmail.com");
            return;
        }
        session.data.email = msg;
        await message.reply(
`✅ Email saved!

🎓 *Step 4/5*

Please enter your *Highest Education*:

Example:
- 12th Pass
- Bachelor's (B.Tech/B.Com/BA)
- Master's (MBA/M.Tech)
- PhD`);
        session.stage = 'ask_education';
        return;
    }

    // ============ STAGE: EDUCATION ============
    if (session.stage === 'ask_education') {
        if (msg.length < 2) {
            await message.reply("❌ Please enter valid education details.");
            return;
        }
        session.data.education = msg;
        await message.reply(
`✅ Education saved!

💼 *Step 5/5*

Please enter your *Work Experience* (in years):

Example:
- Fresher
- 2 years
- 5+ years`);
        session.stage = 'ask_experience';
        return;
    }

    // ============ STAGE: EXPERIENCE ============
    if (session.stage === 'ask_experience') {
        session.data.experience = msg;
        
        // Save lead
        const lead = {
            ...session.data,
            whatsappNumber: from.replace('@c.us', ''),
            timestamp: new Date().toLocaleString('en-IN')
        };
        leadsDatabase.push(lead);
        console.log('\n📊 NEW LEAD CAPTURED:');
        console.log(lead);
        console.log('');

        await message.reply(
`🎉 *Thank you, ${session.data.name}!* 🎉

Your details have been saved successfully! ✅

━━━━━━━━━━━━━━━━━
📋 *Your Details:*
👤 Name: ${session.data.name}
📱 Phone: ${session.data.phone}
📧 Email: ${session.data.email}
🎓 Education: ${session.data.education}
💼 Experience: ${session.data.experience}
━━━━━━━━━━━━━━━━━

Now, how can I help you today? 😊`);

        // Show menu after delay
        setTimeout(async () => {
            await client.sendMessage(from,
`📋 *Please select an option:*

1️⃣ Visa Information
2️⃣ Country Selection
3️⃣ Eligibility Check
4️⃣ Document Requirements
5️⃣ Processing Time & Fees
6️⃣ Book Free Consultation
7️⃣ Talk to Human Agent

Reply with the *number* (1-7)`);
        }, 2000);
        
        session.stage = 'main_menu';
        return;
    }

    // ============ STAGE: MAIN MENU ============
    if (session.stage === 'main_menu') {
        await handleMenuOption(message, msgLower, session);
        return;
    }
});

// ============ MENU HANDLER ============
async function handleMenuOption(message, msg, session) {
    switch (msg) {
        case '1':
        case 'visa':
        case 'visa info':
            await message.reply(
`📋 *Visa Services We Offer:*

✈️ *Study Visa* - Type "study"
💼 *Work Visa* - Type "work"
🏠 *PR Visa* - Type "pr"
👨‍👩‍👧 *Family Visa* - Type "family"
🏖️ *Tourist Visa* - Type "tourist"
💰 *Investor Visa* - Type "investor"

Type *"menu"* to go back`);
            break;

        case '2':
        case 'country':
        case 'countries':
            await message.reply(
`🌐 *Countries We Deal With:*

🇨🇦 Canada - Type "canada"
🇦🇺 Australia - Type "australia"
🇬🇧 UK - Type "uk"
🇺🇸 USA - Type "usa"
🇳🇿 New Zealand - Type "nz"
🇩🇪 Germany - Type "germany"
🇸🇬 Singapore - Type "singapore"

Type *"menu"* to go back`);
            break;

        case '3':
        case 'eligibility':
            await message.reply(
`✅ *Eligibility Check*

Based on your profile:
👤 ${session.data.name}
🎓 ${session.data.education}
💼 ${session.data.experience}

Our expert will analyze your profile and share:
✓ Best suited countries
✓ Visa options available
✓ Points calculation
✓ Success probability

📞 We'll call you within 24 hours on ${session.data.phone}!

Type *"menu"* to go back`);
            break;

        case '4':
        case 'documents':
        case 'docs':
            await message.reply(
`📄 *General Documents Required:*

✅ Valid Passport (6+ months validity)
✅ Passport size photographs
✅ Educational certificates
✅ IELTS/PTE/TOEFL scorecard
✅ Work experience letters
✅ Bank statements (6 months)
✅ ITR (Last 2 years)
✅ Medical certificates
✅ Police clearance certificate

*Note:* Specific documents vary by visa type.

Type *"menu"* to go back`);
            break;

        case '5':
        case 'fees':
        case 'cost':
            await message.reply(
`💰 *Processing Time & Fees:*

📌 *Study Visa*
⏱ 4-8 weeks | 💵 Starting ₹50,000

📌 *Work Visa*
⏱ 8-12 weeks | 💵 Starting ₹80,000

📌 *PR Visa*
⏱ 12-18 months | 💵 Starting ₹1,50,000

📌 *Tourist Visa*
⏱ 2-4 weeks | 💵 Starting ₹15,000

📌 *Family Visa*
⏱ 6-12 months | 💵 Starting ₹1,00,000

*Fees exclude government charges*

Type *"book"* to book consultation
Type *"menu"* for main menu`);
            break;

        case '6':
        case 'book':
        case 'consultation':
            await message.reply(
`📅 *Free Consultation Booked!* ✅

Hi *${session.data.name}*,

Your consultation request has been received!

📞 Our expert will call you on *${session.data.phone}* within 24 hours.

📧 Confirmation email sent to: *${session.data.email}*

*Our Office:*
🏢 Go Global Immigration Services
📞 +91-XXXXXXXXXX
🕐 Mon-Sat: 10 AM - 7 PM

Type *"menu"* to explore more`);
            break;

        case '7':
        case 'agent':
        case 'human':
            await message.reply(
`👨‍💼 *Connecting to Human Agent...*

Hi *${session.data.name}*, our expert will contact you shortly on *${session.data.phone}*.

📞 *Direct Call:* +91-XXXXXXXXXX
📧 *Email:* info@goglobalimmigration.com
🕐 *Timings:* Mon-Sat, 10 AM - 7 PM

Type *"menu"* to return`);
            break;

        case 'menu':
        case 'main menu':
        case 'back':
            await message.reply(
`📋 *Main Menu*

1️⃣ Visa Information
2️⃣ Country Selection
3️⃣ Eligibility Check
4️⃣ Document Requirements
5️⃣ Processing Time & Fees
6️⃣ Book Free Consultation
7️⃣ Talk to Human Agent

Reply with the *number* (1-7)`);
            break;

        // Countries
        case 'canada':
            await message.reply(
`🇨🇦 *Canada Immigration Options:*

✅ Express Entry (PR)
✅ Provincial Nominee Program (PNP)
✅ Study Permit
✅ Work Permit (LMIA)
✅ Visitor Visa
✅ Family Sponsorship

*Requirements:*
• IELTS 6.0+ bands
• Age: 18-45
• Education: Graduate+

Type *"book"* for consultation
Type *"menu"* for main menu`);
            break;

        case 'australia':
            await message.reply(
`🇦🇺 *Australia Immigration Options:*

✅ Skilled Independent Visa (189)
✅ Skilled Nominated Visa (190)
✅ Student Visa (500)
✅ Work Visa (482)
✅ Partner Visa

*Requirements:*
• IELTS 6.0+ bands
• Age: 18-45
• Points: 65+

Type *"book"* for consultation
Type *"menu"* for main menu`);
            break;

        case 'uk':
            await message.reply(
`🇬🇧 *UK Immigration Options:*

✅ Student Visa
✅ Skilled Worker Visa
✅ Global Talent Visa
✅ Innovator Visa
✅ Family Visa

Type *"book"* for consultation
Type *"menu"* for main menu`);
            break;

        case 'usa':
            await message.reply(
`🇺🇸 *USA Immigration Options:*

✅ F1 Student Visa
✅ H1B Work Visa
✅ B1/B2 Tourist Visa
✅ EB-5 Investor Visa
✅ Green Card

Type *"book"* for consultation
Type *"menu"* for main menu`);
            break;

        case 'nz':
            await message.reply(
`🇳🇿 *New Zealand Immigration:*

✅ Skilled Migrant Visa
✅ Student Visa
✅ Work Visa
✅ Resident Visa

Type *"book"* for consultation`);
            break;

        case 'germany':
            await message.reply(
`🇩🇪 *Germany Immigration:*

✅ Job Seeker Visa
✅ EU Blue Card
✅ Student Visa
✅ Work Visa

Type *"book"* for consultation`);
            break;

        case 'singapore':
            await message.reply(
`🇸🇬 *Singapore Immigration:*

✅ Employment Pass
✅ S Pass
✅ Student Pass
✅ PR Application

Type *"book"* for consultation`);
            break;

        // Visa Types
        case 'study':
            await message.reply(
`📚 *Study Visa Services:*

✅ University Selection
✅ Application Filing
✅ SOP/LOR Preparation
✅ Visa Interview Prep
✅ Pre-departure Guidance

Type *"book"* to start!`);
            break;

        case 'work':
            await message.reply(
`💼 *Work Visa Services:*

✅ Job Search Assistance
✅ Resume Building
✅ LMIA Processing
✅ Work Permit Filing
✅ PR Pathway Guidance

Type *"book"* to start!`);
            break;

        case 'pr':
            await message.reply(
`🏠 *PR Visa Services:*

✅ Points Calculation
✅ Express Entry Profile
✅ PNP Applications
✅ Document Verification
✅ Complete Filing

Type *"book"* to start!`);
            break;

        case 'tourist':
            await message.reply(
`🏖️ *Tourist Visa Services:*

✅ Schengen Visa
✅ USA B1/B2
✅ UK Visitor
✅ Canada Visitor
✅ Dubai Tourist

Type *"book"* to start!`);
            break;

        case 'family':
            await message.reply(
`👨‍👩‍👧 *Family Visa Services:*

✅ Spouse Visa
✅ Parent Sponsorship
✅ Child Dependent
✅ Family Reunification

Type *"book"* to start!`);
            break;

        case 'investor':
            await message.reply(
`💰 *Investor Visa Services:*

✅ USA EB-5
✅ Canada SUV
✅ UK Innovator
✅ Portugal Golden Visa

Type *"book"* to start!`);
            break;

        default:
            await message.reply(
`🤔 I didn't understand that.

Type *"menu"* to see options
Type *"agent"* to talk to human
Type *"reset"* to start over`);
    }
}

// ============ EXPRESS SERVER FOR LEADS ============
app.get('/', (req, res) => {
    res.send(`
        <h1>🌍 Go Global Immigration Bot</h1>
        <p>✅ Bot is running successfully!</p>
        <p>Total Leads Captured: <b>${leadsDatabase.length}</b></p>
        <a href="/leads">View All Leads</a>
    `);
});

app.get('/leads', (req, res) => {
    let html = `
        <html>
        <head>
            <title>Leads - Go Global</title>
            <style>
                body { font-family: Arial; padding: 20px; background: #f5f5f5; }
                h1 { color: #25D366; }
                table { border-collapse: collapse; width: 100%; background: white; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #25D366; color: white; }
                tr:nth-child(even) { background: #f9f9f9; }
            </style>
        </head>
        <body>
            <h1>📊 Total Leads: ${leadsDatabase.length}</h1>
            <table>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Education</th>
                    <th>Experience</th>
                    <th>WhatsApp</th>
                    <th>Date/Time</th>
                </tr>
    `;
    
    leadsDatabase.forEach((lead, i) => {
        html += `
            <tr>
                <td>${i + 1}</td>
                <td>${lead.name}</td>
                <td>${lead.phone}</td>
                <td>${lead.email}</td>
                <td>${lead.education}</td>
                <td>${lead.experience}</td>
                <td>${lead.whatsappNumber}</td>
                <td>${lead.timestamp}</td>
            </tr>
        `;
    });
    
    html += `</table></body></html>`;
    res.send(html);
});

app.listen(PORT, () => {
    console.log(`📊 Leads dashboard: http://localhost:${PORT}/leads`);
});

// ============ INITIALIZE BOT ============
console.log('🚀 Starting WhatsApp Bot...');
console.log('⏳ Please wait for QR code...\n');
client.initialize();