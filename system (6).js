// ================= FILE STORAGE SYSTEM =================
const API_BASE = window.location.origin;

async function saveToFile(key, value) {
    try {
        const response = await fetch(`${API_BASE}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        });
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Error saving to file:', error);
        return false;
    }
}

async function loadFromFile(key) {
    try {
        const response = await fetch(`${API_BASE}/api/load?key=${key}`);
        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('Error loading from file:', error);
        return null;
    }
}

async function deleteFile(key) {
    try {
        const response = await fetch(`${API_BASE}/api/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
        });
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
}

async function loadFromStorage(key) {
    return await loadFromFile(key);
}

async function saveToStorage(key, value) {
    return await saveToFile(key, value);
}

async function deleteFromStorage(key) {
    return await deleteFile(key);
}

// ============= UTILITY FUNCTIONS =============

// แปลง cm เป็น pixels
function cmToPx(cm, dpi = 300) {
    return Math.floor((cm * dpi) / 2.54);
}

// สร้าง Image object จาก base64
function createImageFromData(data) {
    return new Promise((resolve, reject) => {
        if (!data) {
            reject(new Error('ไม่มีข้อมูลลายน้ำ'));
            return;
        }
        
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('ไม่สามารถโหลดภาพลายน้ำได้'));
        img.src = data;
    });
}

// ================= SETTINGS MANAGEMENT =================

function getDefaultSettings() {
    return {
        watermarkSizePortrait: 20,   // ขนาดลายน้ำสำหรับรูปแนวตั้ง
        watermarkSizeLandscape: 20,  // ขนาดลายน้ำสำหรับรูปแนวนอน
        bottomMargin: 0.1,
        dpi: 300,
        quality: 95,
        brightnessThreshold: 128
    };
}

async function loadSettings() {
    try {
        const data = await loadFromFile('settings');
        if (data) {
            const settings = JSON.parse(data);
            if (!settings.watermarkSizePortrait) settings.watermarkSizePortrait = settings.watermarkSize || 20;
            if (!settings.watermarkSizeLandscape) settings.watermarkSizeLandscape = settings.watermarkSize || 20;
            return settings;
        }
        return getDefaultSettings();
    } catch (error) {
        console.error('Error loading settings:', error);
        return getDefaultSettings();
    }
}

async function saveSettings(settings) {
    try {
        return await saveToFile('settings', JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving settings:', error);
        return false;
    }
}

// ================= VALIDATION =================

function validatePassword(password) {
    if (!password || password.trim().length < 4) {
        return {
            valid: false,
            message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'
        };
    }
    
    if (password.includes(' ')) {
        return {
            valid: false,
            message: 'รหัสผ่านห้ามมีช่องว่าง'
        };
    }
    
    return {
        valid: true,
        message: 'รหัสผ่านถูกต้อง'
    };
}

// ================= ADMIN AUTHENTICATION =================

async function verifyAdminPassword(password) {
    try {
        const savedPassword = await loadFromFile('admin-password');
        return savedPassword === password;
    } catch (error) {
        console.error('Error verifying admin password:', error);
        return false;
    }
}

async function setAdminPassword(password) {
    try {
        const validation = validatePassword(password);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }
        
        const result = await saveToFile('admin-password', password);
        if (result) {
            return { success: true, message: 'ตั้งรหัสผ่านสำเร็จ' };
        } else {
            return { success: false, message: 'ไม่สามารถบันทึกรหัสผ่านได้' };
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function hasAdminPassword() {
    try {
        const password = await loadFromFile('admin-password');
        return password !== null && password !== undefined && password !== '';
    } catch (error) {
        console.error('Error checking admin password:', error);
        return false;
    }
}

// ================= IMAGE PROCESSING UTILITIES =================

// สร้าง Image object จาก base64
function createImageFromData(data) {
    return new Promise((resolve, reject) => {
        if (!data) {
            reject(new Error('ไม่มีข้อมูลลายน้ำ'));
            return;
        }
        
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('ไม่สามารถโหลดภาพลายน้ำได้'));
        img.src = data;
    });
}

// Trim พื้นหลัง (โปร่งใสและขาว) ออก
function trimWatermarkBackground(img, options = {}) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;
        
        const removeWhiteBg = options.removeWhiteBg || false;
        const whiteThreshold = options.whiteThreshold || 240;
        
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const index = (y * canvas.width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];
                
                let shouldInclude = false;
                
                if (removeWhiteBg) {
                    // สำหรับลายน้ำดำ: ลบทั้งพื้นโปร่งใสและพื้นขาว
                    const isWhite = r > whiteThreshold && g > whiteThreshold && b > whiteThreshold;
                    const isTransparent = a === 0;
                    shouldInclude = !isTransparent && !isWhite;
                } else {
                    // สำหรับลายน้ำขาว: ลบเฉพาะพื้นโปร่งใส
                    shouldInclude = a > 0;
                }
                
                if (shouldInclude) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        // ถ้าไม่พบ pixel ที่ควร include
        if (minX > maxX || minY > maxY) {
            minX = 0;
            minY = 0;
            maxX = canvas.width - 1;
            maxY = canvas.height - 1;
        }
        
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        
        const trimmedCanvas = document.createElement('canvas');
        const trimmedCtx = trimmedCanvas.getContext('2d');
        
        trimmedCanvas.width = width;
        trimmedCanvas.height = height;
        
        trimmedCtx.drawImage(
            img,
            minX, minY, width, height,
            0, 0, width, height
        );
        
        const trimmedImage = new Image();
        trimmedImage.onload = () => {
            resolve({
                image: trimmedImage,
                x: minX,
                y: minY,
                width: width,
                height: height,
                originalWidth: img.width,
                originalHeight: img.height,
                aspectRatio: width / height
            });
        };
        trimmedImage.onerror = () => {
            resolve({
                image: img,
                x: 0,
                y: 0,
                width: img.width,
                height: img.height,
                originalWidth: img.width,
                originalHeight: img.height,
                aspectRatio: img.width / img.height
            });
        };
        trimmedImage.src = trimmedCanvas.toDataURL('image/png');
    });
}


// เตรียมลายน้ำดำ (ลบพื้นขาวด้วย)
// เตรียมลายน้ำดำ (ลบพื้นขาวเหมือนโลโก้ขาว)
async function prepareBlackWatermark(watermarkData) {
    try {
        const img = await createImageFromData(watermarkData);
        const trimmed = await trimWatermarkBackground(img, { 
            removeWhiteBg: true,      // ← เปลี่ยนกลับเป็น true
            whiteThreshold: 240       // ← ลดจาก 250 เป็น 240
        });
        
        console.log('⚫ ลายน้ำดำ:',
            `เดิม ${img.width}x${img.height}`,
            `→ ใหม่ ${trimmed.width}x${trimmed.height}`,
            `(aspect: ${trimmed.aspectRatio.toFixed(2)})`
        );
        
        return trimmed;
    } catch (error) {
        console.error('Error preparing black watermark:', error);
        const img = await createImageFromData(watermarkData);
        return {
            image: img,
            x: 0,
            y: 0,
            width: img.width,
            height: img.height,
            originalWidth: img.width,
            originalHeight: img.height,
            aspectRatio: img.width / img.height
        };
    }
}

// เตรียมลายน้ำขาว (ลบพื้นขาวด้วยเหมือนโลโก้ดำ)
async function prepareWhiteWatermark(watermarkData) {
    try {
        const img = await createImageFromData(watermarkData);
        const trimmed = await trimWatermarkBackground(img, { 
            removeWhiteBg: true,
            whiteThreshold: 250
        });
        
        console.log('⚪ ลายน้ำขาว:',
            `เดิม ${img.width}x${img.height}`,
            `→ ใหม่ ${trimmed.width}x${trimmed.height}`,
            `(aspect: ${trimmed.aspectRatio.toFixed(2)})`
        );
        
        return trimmed;
    } catch (error) {
        console.error('Error preparing white watermark:', error);
        // ถ้า error ให้ใช้รูปต้นฉบับแทน
        const img = await createImageFromData(watermarkData);
        return {
            image: img,
            x: 0,
            y: 0,
            width: img.width,
            height: img.height,
            originalWidth: img.width,
            originalHeight: img.height,
            aspectRatio: img.width / img.height
        };
    }
}

// ================= WATERMARK CACHE SYSTEM =================
const watermarkCache = {
    black: { data: null, originalImage: null, trimmed: null, info: null },
    white: { data: null, originalImage: null, trimmed: null, info: null },
    lastLoadTime: 0,
    cacheDuration: 10 * 60 * 1000, // 10 นาที
    isLoaded: false
};

// โหลดลายน้ำพร้อม cache (โหลดครั้งเดียวใช้ได้หลายรูป)
async function loadWatermarksWithCache() {
    const now = Date.now();
    
    // ถ้าโหลดไว้แล้วและยังไม่หมดอายุ
    if (watermarkCache.isLoaded && 
        (now - watermarkCache.lastLoadTime) < watermarkCache.cacheDuration) {
        console.log('📦 ใช้ลายน้ำจาก cache');
        return {
            black: watermarkCache.black.data,
            white: watermarkCache.white.data,
            blackTrimmed: watermarkCache.black.trimmed,
            whiteTrimmed: watermarkCache.white.trimmed,
            blackInfo: watermarkCache.black.info,
            whiteInfo: watermarkCache.white.info
        };
    }
    
    console.log('🔄 โหลดลายน้ำใหม่จาก storage');
    try {
        const blackData = await loadFromFile('watermark-black');
        const whiteData = await loadFromFile('watermark-white');
        
        console.log('📦 โหลดข้อมูลสำเร็จ:', {
            black: blackData ? '✅ มี' : '❌ ไม่มี',
            white: whiteData ? '✅ มี' : '❌ ไม่มี'
        });
        
        // เตรียมลายน้ำทั้งสองแบบพร้อมกัน พร้อม timeout และ error handling
        const preparePromises = [];
        
        if (blackData) {
            preparePromises.push(
                Promise.race([
                    prepareBlackWatermark(blackData),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('⏱️ ลายน้ำดำ timeout (เกิน 10 วินาที)')), 10000)
                    )
                ]).catch(err => {
                    console.error('⚠️ ไม่สามารถเตรียมลายน้ำดำได้:', err.message);
                    return null;
                })
            );
        } else {
            preparePromises.push(Promise.resolve(null));
        }
        
        if (whiteData) {
            preparePromises.push(
                Promise.race([
                    prepareWhiteWatermark(whiteData),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('⏱️ ลายน้ำขาว timeout (เกิน 10 วินาที)')), 10000)
                    )
                ]).catch(err => {
                    console.error('⚠️ ไม่สามารถเตรียมลายน้ำขาวได้:', err.message);
                    return null;
                })
            );
        } else {
            preparePromises.push(Promise.resolve(null));
        }
        
        console.log('⏳ กำลังเตรียมลายน้ำ...');
        const [blackTrimmed, whiteTrimmed] = await Promise.all(preparePromises);
        
        // ตรวจสอบผลลัพธ์
        if (blackData && !blackTrimmed) {
            console.warn('⚠️ ลายน้ำดำเตรียมไม่สำเร็จ');
        }
        if (whiteData && !whiteTrimmed) {
            console.warn('⚠️ ลายน้ำขาวเตรียมไม่สำเร็จ');
        }
        
        // อัพเดท cache
        watermarkCache.black.data = blackData;
        watermarkCache.white.data = whiteData;
        watermarkCache.black.trimmed = blackTrimmed;
        watermarkCache.white.trimmed = whiteTrimmed;
        
        watermarkCache.black.info = blackTrimmed ? {
            width: blackTrimmed.width,
            height: blackTrimmed.height,
            aspectRatio: blackTrimmed.aspectRatio
        } : null;
        
        watermarkCache.white.info = whiteTrimmed ? {
            width: whiteTrimmed.width,
            height: whiteTrimmed.height,
            aspectRatio: whiteTrimmed.aspectRatio
        } : null;
        
        watermarkCache.lastLoadTime = now;
        watermarkCache.isLoaded = true;
        
        console.log('✅ โหลดลายน้ำสำเร็จ:', {
            blackInfo: watermarkCache.black.info ? `${watermarkCache.black.info.width}x${watermarkCache.black.info.height}` : 'null',
            whiteInfo: watermarkCache.white.info ? `${watermarkCache.white.info.width}x${watermarkCache.white.info.height}` : 'null'
        });
        
        return {
            black: blackData,
            white: whiteData,
            blackTrimmed: blackTrimmed,
            whiteTrimmed: whiteTrimmed,
            blackInfo: watermarkCache.black.info,
            whiteInfo: watermarkCache.white.info
        };
        
    } catch (error) {
        console.error('❌ ผิดพลาดในการโหลดลายน้ำ:', error);
        watermarkCache.isLoaded = false;
        return { 
            black: null, white: null,
            blackTrimmed: null, whiteTrimmed: null,
            blackInfo: null, whiteInfo: null 
        };
    }
}

// ================= PROCESSING FUNCTIONS =================

// วิเคราะห์ความสว่างของพื้นที่ที่จะวางลายน้ำ
async function analyzeWatermarkAreaBrightness(imageData, settings, watermarkInfo, isPortrait) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const watermarkSize = isPortrait ? settings.watermarkSizePortrait : settings.watermarkSizeLandscape;
            const wmWidth = img.width * (watermarkSize / 100);
            const wmHeight = wmWidth / watermarkInfo.aspectRatio;
            
            const marginPx = cmToPx(settings.bottomMargin, settings.dpi);
            const x = Math.floor((img.width - wmWidth) / 2);
            const y = Math.floor(img.height - wmHeight - marginPx);
            
            const cropBox = {
                x: Math.max(0, x),
                y: Math.max(0, y),
                width: Math.min(img.width, wmWidth),
                height: Math.min(img.height, wmHeight)
            };
            
            if (cropBox.width <= 0 || cropBox.height <= 0) {
                resolve(settings.brightnessThreshold);
                return;
            }
            
            try {
                const imageDataObj = ctx.getImageData(
                    cropBox.x, 
                    cropBox.y, 
                    cropBox.width, 
                    cropBox.height
                );
                
                let totalBrightness = 0;
                const pixelCount = imageDataObj.data.length / 4;
                
                for (let i = 0; i < imageDataObj.data.length; i += 4) {
                    const r = imageDataObj.data[i];
                    const g = imageDataObj.data[i + 1];
                    const b = imageDataObj.data[i + 2];
                    totalBrightness += (r + g + b) / 3;
                }
                
                const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 128;
                resolve(avgBrightness);
                
            } catch (e) {
                resolve(settings.brightnessThreshold);
            }
        };
        img.onerror = () => resolve(settings.brightnessThreshold);
        img.src = imageData;
    });
}

// ใส่ลายน้ำ (ใช้ cache)
async function processWatermarkOptimized(imageData, watermarkType, settings, watermarkData) {
    return new Promise(async (resolve, reject) => {
        try {
            const img = new Image();
            
            img.onload = async () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const isPortrait = img.height > img.width;
                    const watermarkSize = isPortrait ? settings.watermarkSizePortrait : settings.watermarkSizeLandscape;
                    
                    const wmInfo = watermarkType === 'black' ? watermarkData.blackInfo : watermarkData.whiteInfo;
                    const wmTrimmed = watermarkType === 'black' ? watermarkData.blackTrimmed : watermarkData.whiteTrimmed;
                    
                    if (!wmInfo || !wmTrimmed) {
                        reject(new Error(`ไม่พบข้อมูลลายน้ำ${watermarkType === 'black' ? 'ดำ' : 'ขาว'}`));
                        return;
                    }
                    
                    const wmWidth = img.width * (watermarkSize / 100);
                    const wmHeight = wmWidth / wmInfo.aspectRatio;
                    
                    const marginPx = cmToPx(settings.bottomMargin, settings.dpi);
                    const x = Math.floor((img.width - wmWidth) / 2);
                    let y = Math.floor(img.height - wmHeight - marginPx);
                    
                    if (y < 0) y = 0;
                    
                    console.log(`🎨 ${watermarkType === 'black' ? '⚫ ดำ' : '⚪ ขาว'}:`,
                        `รูป ${img.width}x${img.height} (${isPortrait ? 'แนวตั้ง' : 'แนวนอน'})`,
                        `ลายน้ำ ${Math.round(wmWidth)}x${Math.round(wmHeight)} (${watermarkSize}%)`,
                        `ตำแหน่ง y=${y}`
                    );
                    
                    ctx.drawImage(
                        wmTrimmed.image,
                        x, y, wmWidth, wmHeight
                    );
                    
                    const result = canvas.toDataURL('image/jpeg', settings.quality / 100);
                    resolve(result);
                    
                } catch (drawError) {
                    reject(drawError);
                }
            };
            
            img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพต้นฉบับได้'));
            img.src = imageData;
            
        } catch (error) {
            reject(error);
        }
    });
}

// ประมวลผลหลายรูป (ใช้ cache)
async function processMultipleImagesOptimized(images, mode, progressCallback) {
    const settings = await loadSettings();
    const watermarkData = await loadWatermarksWithCache();
    
    // ตรวจสอบลายน้ำ
    if (mode === 'auto' && (!watermarkData.black || !watermarkData.white)) {
        throw new Error('ไม่พบลายน้ำ กรุณาติดต่อแอดมิน');
    }
    if (mode === 'black' && !watermarkData.black) {
        throw new Error('ไม่พบลายน้ำสีดำ');
    }
    if (mode === 'white' && !watermarkData.white) {
        throw new Error('ไม่พบลายน้ำสีขาว');
    }
    
    const results = [];
    
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        let watermarkType = '';
        let usedColor = '';
        let brightness = 0;
        
        try {
            const tempImg = await loadImage(img.data);
            const isPortrait = tempImg.height > tempImg.width;
            
            if (mode === 'auto') {
                brightness = await analyzeWatermarkAreaBrightness(
                    img.data, 
                    settings, 
                    watermarkData.blackInfo, 
                    isPortrait
                );
                
                if (brightness > settings.brightnessThreshold) {
                    watermarkType = 'black';
                    usedColor = 'ดำ';
                } else {
                    watermarkType = 'white';
                    usedColor = 'ขาว';
                }
            } else if (mode === 'black') {
                watermarkType = 'black';
                usedColor = 'ดำ';
            } else {
                watermarkType = 'white';
                usedColor = 'ขาว';
            }
            
            const result = await processWatermarkOptimized(
                img.data, 
                watermarkType, 
                settings, 
                watermarkData
            );
            
            results.push({
                name: img.name,
                data: result,
                color: usedColor,
                orientation: isPortrait ? 'แนวตั้ง' : 'แนวนอน',
                brightness: mode === 'auto' ? Math.round(brightness) : null,
                success: true
            });
            
        } catch (error) {
            console.error(`Error processing ${img.name}:`, error);
            results.push({
                name: img.name,
                error: error.message,
                success: false
            });
        }
        
        if (progressCallback) {
            const progress = ((i + 1) / images.length) * 100;
            progressCallback(progress, i + 1, images.length);
        }
    }
    
    return results;
}

// ================= COMPATIBILITY FUNCTIONS =================

// ฟังก์ชันเก่า (สำหรับ compatibility)
async function loadWatermarks() {
    const data = await loadWatermarksWithCache();
    return {
        black: data.black,
        white: data.white
    };
}

async function saveBlackWatermark(data) {
    watermarkCache.isLoaded = false; // รีเซ็ต cache
    return await saveToFile('watermark-black', data);
}

async function saveWhiteWatermark(data) {
    watermarkCache.isLoaded = false; // รีเซ็ต cache
    return await saveToFile('watermark-white', data);
}

function loadImage(base64) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = base64;
    });
}

// ฟังก์ชันเก่า (ยังใช้ได้)
async function processWatermark(imageData, watermarkData, settings) {
    console.warn('⚠️ ใช้ processWatermarkOptimized แทนเพื่อประสิทธิภาพที่ดีกว่า');
    
    // ตรวจสอบว่า watermarkData เป็นข้อมูลหรือเป็น type
    if (typeof watermarkData === 'string') {
        if (watermarkData.includes('black') || watermarkData.includes('white')) {
            const watermarkType = watermarkData.includes('black') ? 'black' : 'white';
            const watermarkInfo = await loadWatermarksWithCache();
            return await processWatermarkOptimized(imageData, watermarkType, settings, watermarkInfo);
        }
    }
    
    // กรณีส่งข้อมูลมาโดยตรง
    return new Promise(async (resolve, reject) => {
        try {
            const img = new Image();
            
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const isPortrait = img.height > img.width;
                const watermarkSize = isPortrait ? settings.watermarkSizePortrait : settings.watermarkSizeLandscape;
                
                const wmImg = new Image();
                wmImg.onload = async () => {
                    try {
                        const trimmed = await trimWatermarkBackground(wmImg, {
                            removeWhiteBg: watermarkData.includes('black') // ถ้าเป็นลายน้ำดำให้ลบพื้นขาว
                        });
                        
                        const wmWidth = img.width * (watermarkSize / 100);
                        const wmHeight = wmWidth / trimmed.aspectRatio;
                        
                        const marginPx = cmToPx(settings.bottomMargin, settings.dpi);
                        const x = Math.floor((img.width - wmWidth) / 2);
                        let y = Math.floor(img.height - wmHeight - marginPx);
                        
                        if (y < 0) y = 0;
                        
                        ctx.drawImage(
                            trimmed.image,
                            x, y, wmWidth, wmHeight
                        );
                        
                        const result = canvas.toDataURL('image/jpeg', settings.quality / 100);
                        resolve(result);
                        
                    } catch (trimError) {
                        reject(trimError);
                    }
                };
                
                wmImg.onerror = () => reject(new Error('Failed to load watermark image'));
                wmImg.src = watermarkData;
            };
            
            img.onerror = () => reject(new Error('Failed to load source image'));
            img.src = imageData;
            
        } catch (error) {
            reject(error);
        }
    });
}

async function processMultipleImages(images, mode, progressCallback) {
    console.warn('⚠️ ใช้ processMultipleImagesOptimized แทนเพื่อประสิทธิภาพที่ดีกว่า');
    return await processMultipleImagesOptimized(images, mode, progressCallback);
}

function analyzeImageBrightness(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const startY = Math.floor(canvas.height * 0.8);
            const height = canvas.height - startY;
            const imageDataObj = ctx.getImageData(0, startY, canvas.width, height);
            
            let totalBrightness = 0;
            const pixelCount = imageDataObj.data.length / 4;
            
            for (let i = 0; i < imageDataObj.data.length; i += 4) {
                const r = imageDataObj.data[i];
                const g = imageDataObj.data[i + 1];
                const b = imageDataObj.data[i + 2];
                totalBrightness += (r + g + b) / 3;
            }
            
            const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 128;
            resolve(avgBrightness);
        };
        img.onerror = () => resolve(128);
        img.src = imageData;
    });
}

// ================= FILE UTILITIES =================

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
}

function downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function downloadMultipleImages(images, delay = 500) {
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        downloadImage(img.data, `watermarked_${img.name}`);
        if (i < images.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// ================= CONSOLE INFO =================
console.log('%c🎨 ระบบใส่ลายน้ำอัตโนมัติ (Optimized)', 'font-size: 20px; font-weight: bold; color: #ff6b9d;');
console.log('%c✨ Created by Tunkup', 'font-size: 14px; color: #ffd93d;');
console.log('%c📦 System.js V6 - Cached Watermark System', 'font-size: 12px; color: #6bcf7f;');
console.log('%c⚡ โหลดลายน้ำครั้งเดียว ใช้งานได้หลายรูป', 'font-size: 12px; color: #6bcf7f;');
console.log('%c🎯 รองรับโลโก้ดำ-ขาวขนาดต่างกัน', 'font-size: 12px; color: #6bcf7f;');
console.log('%c🔧 Auto-trim พื้นขาว (ลายน้ำดำ) และพื้นโปร่งใส', 'font-size: 12px; color: #6bcf7f;');