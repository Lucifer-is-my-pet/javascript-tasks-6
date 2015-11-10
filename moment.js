'use strict';

function formatString(string, element, replacement) {
    var splittedString = string.split(element);
    string = splittedString.join(replacement);
    return string;
}

module.exports = function () {
    return {
        // Здесь как-то хранится дата ;)
        date: null,

        // А здесь часовой пояс
        timezone: null,

        // Выводит дату в переданном формате
        // - %DD - день недели (ПН, ВТ, СР, ЧТ, ПТ, СБ, ВС)
        // - %HH - часы
        // - %MM - минуты
        format: function (pattern) {
            var theDate = new Date(this.date.getTime());
            theDate.setHours(theDate.getHours() + this.timezone);
            var week = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
            var day = week[theDate.getDay()];
            var hours = theDate.getHours();
            var minutes = theDate.getMinutes();
            if (minutes === 0) {
                minutes = '00';
            }
            var dictOfFormats = {
                '%DD': day,
                '%HH': hours,
                '%MM': minutes
            };
            for (var i in dictOfFormats) {
                if (pattern.indexOf(i) + 1) {
                    pattern = formatString(pattern, i, dictOfFormats[i]);
                }
            }
            return pattern;
        },

        // Возвращает кол-во времени между текущей датой и переданной `moment`
        // в человекопонятном виде
        fromMoment: function (moment) {
            var difference = Date.now() - moment;
            if (difference >= 86400000) {
                return (difference / 86400000) + ' суток';
            } else if (difference >= 3600000) {
                return (difference / 3600000) + ' часов';
            } else if (difference >= 60000) {
                return (difference / 60000) + ' минут';
            } else if (difference >= 1000) {
                return (difference / 1000) + ' секунд';
            }
            return difference + ' милисекунд';
        }
    };
};
