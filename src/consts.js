import api from "api";
import {config} from "dotenv";
import TelegramBot from "node-telegram-bot-api";

config();
export const exchanges = new Set(['Binance', 'Mean']);
export const subscribers = JSON.parse(process.env.SUBSCRIBERS);
export const timeInterval = 1.2e5;
export const noiseThreshold = 0.5;
export const step = 0.5;
export const coinglass = api('@coinglass/v1.0#14g2en3hlaj29iy6');
coinglass.auth(process.env.COINGLASS_API_TOKEN);
export const bot = new TelegramBot(process.env.TELEGRAM_API_TOKEN, {polling: true})
export const statsBTC = {
    exchangeList: [
        {
            longRate: 0,
            name: 'Mean'
        },
        {
            longRate: 0,
            name: "Binance"
        }
    ]
}