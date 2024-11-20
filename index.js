const TelegramBot = require('./telegramBot');
require('dotenv').config();

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

TelegramBot.start();
console.log('Bot started successfully');