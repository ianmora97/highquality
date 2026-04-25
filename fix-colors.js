const fs = require('fs');
const path = require('path');

const filesToFix = [
    'src/backend/views/client/index.hbs',
    'src/backend/views/client/reservar.hbs',
    'src/backend/views/admin/index.hbs',
    'src/backend/views/partials/client/header.hbs',
    'src/backend/views/admin/login.hbs'
];

filesToFix.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');

        // Replace raw hex codes
        content = content.replace(/#3004f3/g, '#FF5E00'); 
        content = content.replace(/#5a3ef5/g, '#E49901'); // Indigo gradient fallback
        
        // Replace tailwind class literals
        content = content.replace(/from-\[#FF5E00\]/g, 'from-primary');
        content = content.replace(/text-\[#FF5E00\]/g, 'text-primary');
        content = content.replace(/bg-\[#FF5E00\]/g, 'bg-primary');
        content = content.replace(/border-\[#FF5E00\]/g, 'border-primary');
        content = content.replace(/shadow-\[0_0_40px_rgba\(48,4,243,0.4\)\]/g, 'shadow-[0_0_40px_rgba(255,94,0,0.4)]');
        content = content.replace(/shadow-\[0_0_60px_rgba\(48,4,243,0.6\)\]/g, 'shadow-[0_0_60px_rgba(255,94,0,0.6)]');
        content = content.replace(/shadow-\[0_4px_20px_rgba\(48,4,243,0.5\)\]/g, 'shadow-[0_4px_20px_rgba(255,94,0,0.5)]');
        content = content.replace(/shadow-\[0_4px_15px_rgba\(48,4,243,0.4\)\]/g, 'shadow-[0_4px_15px_rgba(255,94,0,0.4)]');
        content = content.replace(/drop-shadow-\[0_0_5px_rgba\(48,4,243,0.8\)\]/g, 'drop-shadow-[0_0_5px_rgba(255,94,0,0.8)]');

        // Replace indigo gradients often paired with the old blue
        content = content.replace(/to-indigo-400/g, 'to-tertiary');
        content = content.replace(/to-indigo-500/g, 'to-tertiary');
        content = content.replace(/to-indigo-600/g, 'to-tertiary');

        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`Skipped ${filePath} (not found)`);
    }
});
