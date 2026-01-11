const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 21555;
const DATA_DIR = path.join(__dirname, 'data');

// สร้างโฟลเดอร์ data ถ้ายังไม่มี
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 สร้างโฟลเดอร์ data สำเร็จ');
}

// MIME Types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

// ================= API HANDLERS =================

/**
 * บันทึกข้อมูลลงไฟล์
 */
function handleSaveAPI(req, res) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const { key, value } = JSON.parse(body);
            
            if (!key) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Missing key' }));
                return;
            }
            
            const filename = sanitizeFilename(key) + '.txt';
            const filepath = path.join(DATA_DIR, filename);
            
            fs.writeFileSync(filepath, value, 'utf8');
            
            console.log(`💾 บันทึกไฟล์: ${filename} (${(value.length / 1024).toFixed(2)} KB)`);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Data saved successfully' }));
            
        } catch (error) {
            console.error('Error saving data:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: error.message }));
        }
    });
}

/**
 * โหลดข้อมูลจากไฟล์
 */
function handleLoadAPI(req, res) {
    try {
        const parsedUrl = url.parse(req.url, true);
        const key = parsedUrl.query.key;
        
        if (!key) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Missing key' }));
            return;
        }
        
        const filename = sanitizeFilename(key) + '.txt';
        const filepath = path.join(DATA_DIR, filename);
        
        if (!fs.existsSync(filepath)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'File not found' }));
            return;
        }
        
        const data = fs.readFileSync(filepath, 'utf8');
        
        console.log(`📂 โหลดไฟล์: ${filename} (${(data.length / 1024).toFixed(2)} KB)`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: data }));
        
    } catch (error) {
        console.error('Error loading data:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: error.message }));
    }
}

/**
 * ลบไฟล์
 */
function handleDeleteAPI(req, res) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const { key } = JSON.parse(body);
            
            if (!key) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Missing key' }));
                return;
            }
            
            const filename = sanitizeFilename(key) + '.txt';
            const filepath = path.join(DATA_DIR, filename);
            
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                console.log(`🗑️  ลบไฟล์: ${filename}`);
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'File deleted successfully' }));
            
        } catch (error) {
            console.error('Error deleting file:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: error.message }));
        }
    });
}

/**
 * ทำให้ชื่อไฟล์ปลอดภัย
 */
function sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// ================= MAIN SERVER =================

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    
    const parsedUrl = url.parse(req.url);
    
    // API Routes
    if (parsedUrl.pathname === '/api/save' && req.method === 'POST') {
        handleSaveAPI(req, res);
        return;
    }
    
    if (parsedUrl.pathname === '/api/load' && req.method === 'GET') {
        handleLoadAPI(req, res);
        return;
    }
    
    if (parsedUrl.pathname === '/api/delete' && req.method === 'POST') {
        handleDeleteAPI(req, res);
        return;
    }
    
    // Static File Serving
    let pathname = `.${parsedUrl.pathname}`;
    
    if (pathname === './' || pathname === '' || pathname === './index.html') {
        pathname = './user.html';
    }
    
    fs.exists(pathname, (exist) => {
        if (!exist) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html');
            res.end(`
                <!DOCTYPE html>
                <html lang="th">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>404 - ไม่พบไฟล์</title>
                    <style>
                        body {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-family: Arial, sans-serif;
                        }
                        .container {
                            background: rgba(255,255,255,0.1);
                            backdrop-filter: blur(10px);
                            padding: 40px;
                            border-radius: 20px;
                            text-align: center;
                            color: white;
                            max-width: 500px;
                            border: 1px solid rgba(255,255,255,0.2);
                        }
                        h1 {
                            font-size: 48px;
                            margin-bottom: 20px;
                            color: #ff6b6b;
                        }
                        .btn {
                            display: inline-block;
                            padding: 12px 24px;
                            border-radius: 10px;
                            text-decoration: none;
                            margin: 10px;
                            font-weight: bold;
                            transition: transform 0.3s;
                        }
                        .btn:hover {
                            transform: translateY(-2px);
                        }
                        .btn-primary {
                            background: #4CAF50;
                            color: white;
                        }
                        .btn-secondary {
                            background: #FF9800;
                            color: white;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>404</h1>
                        <h2>ไม่พบไฟล์: ${req.url}</h2>
                        <p>ไม่พบไฟล์ที่คุณต้องการ กรุณาตรวจสอบ URL</p>
                        <div>
                            <a href="/" class="btn btn-primary">🏠 หน้าผู้ใช้</a>
                            <a href="/admin.html" class="btn btn-secondary">🔐 หน้าแอดมิน</a>
                        </div>
                    </div>
                </body>
                </html>
            `);
            return;
        }

        if (fs.statSync(pathname).isDirectory()) {
            pathname += '/index.html';
        }

        fs.readFile(pathname, (err, data) => {
            if (err) {
                res.statusCode = 500;
                res.end(`
                    <html>
                    <body style="background: #ffebee; color: #c62828; padding: 20px;">
                        <h1>⚠️ เกิดข้อผิดพลาด</h1>
                        <p>Error: ${err.message}</p>
                        <a href="/">กลับหน้าหลัก</a>
                    </body>
                    </html>
                `);
            } else {
                const ext = path.parse(pathname).ext.toLowerCase();
                const contentType = mimeTypes[ext] || 'application/octet-stream';
                
                if (ext === '.html') {
                    let html = data.toString();
                    if (!html.includes('<base')) {
                        html = html.replace('<head>', `<head>\n    <base href="/">`);
                    }
                    data = Buffer.from(html, 'utf8');
                }
                
                res.setHeader('Content-Type', contentType);
                res.end(data);
            }
        });
    });
});

// ================= START SERVER =================

server.listen(PORT, '0.0.0.0', () => {
    console.clear();
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║            🚀 ระบบใส่ลายน้ำอัตโนมัติ By Tunkup            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    const { existingFiles, missingFiles } = checkRequiredFiles();
    
    console.log('📂 ตรวจสอบไฟล์:');
    if (existingFiles.length > 0) {
        existingFiles.forEach(file => {
            console.log(`   ✅ ${file}`);
        });
    }
    
    if (missingFiles.length > 0) {
        console.log('\n⚠️  ไฟล์ที่ขาดหาย:');
        missingFiles.forEach(file => {
            console.log(`   ❌ ${file}`);
        });
    }
    
    console.log(`\n💾 โฟลเดอร์เก็บข้อมูล: ${DATA_DIR}`);
    console.log(`   📊 ไฟล์ที่บันทึกไว้: ${getDataFileCount()} ไฟล์`);
    
    console.log('\n🌐 เว็บเซิร์ฟเวอร์กำลังทำงานที่:');
    console.log(`   🔗 http://localhost:${PORT}`);
    console.log(`   🔗 http://${getLocalIP()}:${PORT}`);
    
    console.log('\n📗 ลิงก์สำคัญ:');
    console.log(`   👉 หน้าผู้ใช้: http://localhost:${PORT}`);
    console.log(`   👉 หน้าแอดมิน: http://localhost:${PORT}/admin.html`);
    
    console.log('\n🔧 API Endpoints:');
    console.log(`   POST /api/save - บันทึกข้อมูล`);
    console.log(`   GET  /api/load?key=xxx - โหลดข้อมูล`);
    console.log(`   POST /api/delete - ลบข้อมูล`);
    
    console.log('\n🛑 กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์');
    console.log('═══════════════════════════════════════════════════════════════');
});

function checkRequiredFiles() {
    const requiredFiles = ['system.js', 'user.html', 'admin.html'];
    const existingFiles = [];
    const missingFiles = [];
    
    requiredFiles.forEach(file => {
        if (fs.existsSync(file)) {
            existingFiles.push(file);
        } else {
            missingFiles.push(file);
        }
    });
    
    return { existingFiles, missingFiles };
}

function getDataFileCount() {
    try {
        const files = fs.readdirSync(DATA_DIR);
        return files.filter(f => f.endsWith('.txt')).length;
    } catch (e) {
        return 0;
    }
}

function getLocalIP() {
    try {
        const interfaces = require('os').networkInterfaces();
        for (const devName in interfaces) {
            const iface = interfaces[devName];
            for (let i = 0; i < iface.length; i++) {
                const alias = iface[i];
                if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                    return alias.address;
                }
            }
        }
    } catch (e) {
        console.log('⚠️  ไม่สามารถดึง IP ได้');
    }
    return 'localhost';
}

process.on('SIGINT', () => {
    console.log('\n\n👋 หยุดเซิร์ฟเวอร์แล้ว');
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('⚠️  ข้อผิดพลาดร้ายแรง:', err.message);
    console.log('🔄 รีสตาร์ทเซิร์ฟเวอร์...');
    setTimeout(() => {
        server.close();
        server.listen(PORT);
    }, 1000);
});
