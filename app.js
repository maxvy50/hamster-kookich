import {
    bot,
    coinglass,
    exchanges,
    noiseThreshold,
    statsBTC,
    subscribers,
    threshold,
    timeInterval
} from "./consts.js";



const chats = [];
bot.onText(/\/start/, (msg) => {
    if (chats.indexOf(msg.chat.id) !== -1) return;
    if (subscribers.indexOf(msg.from.username) !== -1) {
        chats.push(msg.chat.id);
        bot.sendMessage(msg.chat.id, `Здарова, кент ${msg.from.first_name}! Я уведомлю тебя, ` +
            `если long rate где-то отклонится на >= ${threshold}%`);
        return;
    }
    bot.sendMessage(msg.chat.id, 'Извините, Вас это еб*ть не должно');
});
setInterval(async () => {
    const newStats = await getStats();
    const outlayers = findOutlayers(newStats);
    if (outlayers.length !== 0) {
        const msg = await prepareNotification(outlayers);
        chats.forEach(cid => {
            bot.sendMessage(cid, msg);
        });
        setStatsBTC(newStats);
    }
}, timeInterval);



const getStats = async () => {
    let temp = {};
    await coinglass.exchangeLongshortRatio({time_type: 'h24', symbol: 'BTC'})
        .then(({data}) => {
            temp.exchangeList = data.data[0].list.map(ex =>
                ({
                    longRate: ex.longRate,
                    name: ex.exchangeName,
                })
            );
            temp.exchangeList.push({
                longRate: data.data[0].longRate,
                name: "Mean",
            });
        })
        .catch(err => console.error(err));
    return temp;
}
const findOutlayers = stats => {
    return stats.exchangeList.filter(ex =>
        exchanges.has(ex.name)
        && Math.abs(ex.longRate - 50) >= threshold
        && Math.abs(ex.longRate - statsBTC.exchangeList.find(e => e.name === ex.name)["longRate"]) >= noiseThreshold
    );
}
const prepareNotification = async exList => {
    const intro = 'За последние сутки:\n';
    const rates = exList.reduce((res, ex) =>
        res + `${ex.name} long rate: ${ex.longRate}\n`, '');
    let price = '';
    await coinglass.perpetualMarket({symbol: 'BTC'})
        .then(({ data }) => {
            let temp = data['data']['BTC'].find(ex =>
                ex['exchangeName'] === 'Binance' && ex['originalSymbol'] === 'BTCUSDT');
            price = `\nЦена: ${Math.floor(temp["price"])} (${temp["priceChangePercent"]}%)`
        })
        .catch(err => console.error(err));
    return intro + rates + price;
}
const setStatsBTC = newStats => {
    for (let k in statsBTC) {
        statsBTC[k] = newStats[k];
    }
}

