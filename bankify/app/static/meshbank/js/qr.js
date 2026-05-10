/**
 * MeshBank QR Code Generator
 * Lightweight client-side QR code generation using canvas
 */

const QRCode = (function() {
    // Simple QR-like code generator for demo purposes
    // Uses a grid-based pattern that encodes data visually

    function generate(canvas, data, size = 200) {
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;
        
        const moduleCount = 21;
        const moduleSize = size / moduleCount;
        
        // Generate deterministic pattern from data
        const hash = hashString(data);
        const bits = generateBits(hash, moduleCount * moduleCount);
        
        // Draw white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        
        // Draw modules
        ctx.fillStyle = '#000000';
        
        // Draw finder patterns (3 corners)
        drawFinderPattern(ctx, 0, 0, moduleSize);
        drawFinderPattern(ctx, (moduleCount - 7) * moduleSize, 0, moduleSize);
        drawFinderPattern(ctx, 0, (moduleCount - 7) * moduleSize, moduleSize);
        
        // Draw data modules
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (isFinderArea(row, col, moduleCount)) continue;
                
                const idx = row * moduleCount + col;
                if (bits[idx]) {
                    ctx.fillRect(
                        col * moduleSize,
                        row * moduleSize,
                        moduleSize - 0.5,
                        moduleSize - 0.5
                    );
                }
            }
        }
        
        // Draw center logo area
        const centerX = (moduleCount / 2 - 2) * moduleSize;
        const centerY = (moduleCount / 2 - 2) * moduleSize;
        const logoSize = 4 * moduleSize;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(centerX, centerY, logoSize, logoSize);
        ctx.fillStyle = '#00d4aa';
        ctx.font = `${logoSize * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏦', centerX + logoSize/2, centerY + logoSize/2 + 2);
    }
    
    function drawFinderPattern(ctx, x, y, moduleSize) {
        // Outer border
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize);
        
        // White inner
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize);
        
        // Center square
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
    }
    
    function isFinderArea(row, col, count) {
        // Top-left
        if (row < 8 && col < 8) return true;
        // Top-right
        if (row < 8 && col >= count - 8) return true;
        // Bottom-left
        if (row >= count - 8 && col < 8) return true;
        return false;
    }
    
    function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    
    function generateBits(seed, count) {
        const bits = [];
        let current = seed;
        for (let i = 0; i < count; i++) {
            current = (current * 1103515245 + 12345) & 0x7fffffff;
            bits.push(current % 3 === 0);
        }
        return bits;
    }
    
    return { generate };
})();
