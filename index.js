const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 21555;

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
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    
    const parsedUrl = url.parse(req.url);
    let pathname = `.${parsedUrl.pathname}`;
    
    if (pathname === './' || pathname === './index.html') {
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
                        }
                        h1 { font-size: 48px; color: #ff6b6b; }
                        .btn {
                            display: inline-block;
                            padding: 12px 24px;
                            margin: 10px;
                            border-radius: 10px;
                            text-decoration: none;
                            font-weight: bold;
                        }
                        .btn-primary { background: #4CAF50; color: white; }
                        .btn-secondary { background: #FF9800; color: white; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>404</h1>
                        <h2>ไม่พบไฟล์: ${req.url}</h2>
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
                res.end('Error: ' + err.message);
            } else {
                const ext = path.parse(pathname).ext.toLowerCase();
                const contentType = mimeTypes[ext] || 'application/octet-stream';
                
                res.setHeader('Content-Type', contentType);
                res.end(data);
            }
        });
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.clear();
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║        🚀 Web Server - ระบบใส่ลายน้ำ By Tunkup           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log('🌐 Web Server กำลังทำงานที่:');
    console.log(`   🔗 http://localhost:${PORT}`);
    console.log(`   🔗 http://${getLocalIP()}:${PORT}`);
    
    console.log('\n📗 ลิงก์:');
    console.log(`   👉 หน้าผู้ใช้: http://localhost:${PORT}`);
    console.log(`   👉 หน้าแอดมิน: http://localhost:${PORT}/admin.html`);
    
    console.log('\n⚠️  หมายเหตุ: ต้องรัน API Server (Python) ที่ port 8000 ด้วย');
    console.log('   คำสั่ง: python api_server.py');
    
    console.log('\n🛑 กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์');
    console.log('═══════════════════════════════════════════════════════════════');
});

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
    } catch (e) {}
    return 'localhost';
}

process.on('SIGINT', () => {
    console.log('\n\n👋 หยุด Web Server แล้ว');
    process.exit(0);
});
