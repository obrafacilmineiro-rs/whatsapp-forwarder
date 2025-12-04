const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const app = express();

app.use(express.json());

// WhatsApp do ATENDENTE REAL (SEU CLIENTE)
const ATENDENTE_REAL = '5512988451940@c.us'; // MUDE AQUI pro número real

let sock;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada:', lastDisconnect?.error, ', reconectando:', shouldReconnect);
            if(shouldReconnect) connectToWhatsApp();
        } else if(connection === 'open') {
            console.log('✅ WhatsApp conectado!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
            const numeroCliente = msg.key.remoteJid;
            const textoCliente = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            
            // FORWARD com contexto pro ATENDENTE
            const mensagemForward = `🔄 *NOVO CLIENTE*\n\n👤 ${numeroCliente.replace('@s.whatsapp.net', '')}\n💬 ${textoCliente}\n\n--- *Responda aqui*`;
            
            await sock.sendMessage(ATENDENTE_REAL, { text: mensagemForward });
            console.log('✅ Mensagem forwardada!');
        }
    });
}

app.get('/', (req, res) => res.send('🤖 WhatsApp Forwarder OK!'));

connectToWhatsApp();

app.listen(process.env.PORT || 3000, () => {
    console.log('🚀 Servidor rodando na porta', process.env.PORT || 3000);
});
