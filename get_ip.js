const os = require('os');
const interfaces = os.networkInterfaces();
for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
        if ('IPv4' !== iface.family || iface.internal) {
            continue;
        }
        console.log(iface.address);
    }
}