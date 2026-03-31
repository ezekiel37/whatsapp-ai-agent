'use strict';

const express = require('express');
const { Client } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client();

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.initialize();

app.get('/', (req, res) => {
    res.send('WhatsApp AI Agent Server is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
