import {
    bot,
    coinglass,
    exchanges,
    step,
    noiseThreshold,
    statsBTC,
    subscribers,
    timeInterval
} from "./consts.js"




const getStats = async () => {
    let temp = {}
    await coinglass.exchangeLongshortRatio({time_type: 'h24', symbol: 'BTC'})
        .then(({data}) => {
            temp.exchangeList = data.data[0].list.map(ex =>
                ({
                    longRate: ex.longRate,
                    name: ex.exchangeName,
                })
            )
            temp.exchangeList.push({
                longRate: data.data[0].longRate,
                name: "Mean",
            })
        })
        .catch(err => console.error(err))
    return temp
}
/*findOutlayers принимает список всех бирж, возвращает список интересующих бирж с коэффициентами срочности
сперва фильтрует интересуемые биржи из exchanges
затем определяет статистическую значимость изменений рэйтов по noiseThreshold
затем вычисляет, насколько эти изменения срочны к реагированию по сетке с шагом step*/
const findOutlayers = stats => {
    let temp = stats.exchangeList.filter(ex =>
        exchanges.has(ex.name)
    )
    let isNoise = temp.reduce((res, o) => 
    res && Math.abs(o.longRate - statsBTC.exchangeList.find(e => e.name === o.name)["longRate"]) < noiseThreshold 
    , true)
    if (isNoise) return []
    temp.forEach(ex => {
        let abs =  Math.floor(Math.abs(ex.longRate - 50) / step)
        ex.urgency = ex.longRate >= 50 ? abs : - abs
    })
    return temp
}
const prepareNotification = async (outlayers) => {
    const visualize = urgency => {
        //U+2705 check mark
        //U+274C cross mark
        let mark = urgency >= 0 ? '\u2705' : '\u274C'
        return mark.repeat(Math.abs(urgency))
    }
    const intro = 'За последние сутки:\n\n'
    const rates = outlayers.reduce((res, o) =>
        res + `${visualize(o.urgency)} ${o.name} long rate: ${o.longRate}\n`
    , '')
    let price = ''
    await coinglass.perpetualMarket({symbol: 'BTC'})
        .then(({ data }) => {
            let temp = data['data']['BTC'].find(ex =>
                ex['exchangeName'] === 'Binance' && ex['originalSymbol'] === 'BTCUSDT')
            price = `\nЦена: ${Math.floor(temp["price"])} (${temp["priceChangePercent"]}%)`
        })
        .catch(err => console.error(err))
    return intro + rates + price
}
const setStatsBTC = newStats => {
    for (let prop in newStats)
        if (statsBTC.hasOwnProperty(prop))
            statsBTC[prop] = newStats[prop]
}




setStatsBTC(await getStats())

setInterval(async () => {
    const newStats = await getStats()
    const outlayers = findOutlayers(newStats)
    if (outlayers.length === 0) return
    const msg = await prepareNotification(outlayers)
    subscribers.forEach(id => {
        bot.sendMessage(id, msg)
    })
    setStatsBTC(newStats)
}, timeInterval)

bot.onText(/.+/, (msg) => {
    if (subscribers.indexOf(msg.chat.id) !== -1) {
        bot.sendMessage(msg.chat.id, `Да, ${msg.from.first_name}, я работаю`)
        return
    }
    bot.sendMessage(msg.chat.id, 'Администратор пока не счел нужным добавить вас')
});