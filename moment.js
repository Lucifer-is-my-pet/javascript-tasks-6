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
            var currentTime = new Date(this.date.getTime());
            currentTime.setHours(currentTime.getHours() + this.timezone);
            var dayOfTheWeek = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
            var day = dayOfTheWeek[currentTime.getDay()];
            var hours = currentTime.getHours();
            var minutes = currentTime.getMinutes();
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
        }
    };
};
