'use strict';

var moment = require('./moment');

function sliceAndParse(string, index) {
    return parseInt(string.slice(index, index + 2));
}

function convertToUTC(schedule, offset) {
    var result = {
        from: [],
        to: []
    };
    var hoursFrom = schedule['from'].slice(0, 2);
    var hoursTo = schedule['to'].slice(0, 2);
    var anyDate = new Date;
    anyDate.setHours(hoursFrom - offset);
    var newHoursFrom = anyDate.getHours();
    anyDate.setHours(hoursTo - offset);
    var newHoursTo = anyDate.getHours();
    result['from'].push(newHoursFrom);
    result['from'].push(sliceAndParse(schedule['from'], 3));
    result['to'].push(newHoursTo);
    result['to'].push(sliceAndParse(schedule['to'], 3));
    return result;
}

function setHHMM(time, arrayOfSettings) {
    time.setHours(arrayOfSettings[0]);
    time.setMinutes(arrayOfSettings[1]);
}

function fillSchedule(schedule) {
    var result = {};
    for (var i in schedule) {
        result[i] = [];
    }
    var week = ['ВС', 'ПН', 'ВТ', 'СР'];
    for (var i in schedule) {
        for (var j in schedule[i]) {
            result[i].push({ // часы - сдвиг, минуты, день недели
                from: [sliceAndParse(schedule[i][j]['from'], 3) -
                sliceAndParse(schedule[i][j]['from'], 8),
                    sliceAndParse(schedule[i][j]['from'], 6),
                    week.indexOf(schedule[i][j]['from'].slice(0, 2))],
                to: [sliceAndParse(schedule[i][j]['to'], 3) -
                sliceAndParse(schedule[i][j]['to'], 8),
                    sliceAndParse(schedule[i][j]['to'], 6),
                    week.indexOf(schedule[i][j]['to'].slice(0, 2))]
            });
        }
    }
    return result;
}

function durationBetween(from, to) {
    var duration = Math.abs(from - to);
    return duration / 60000; // в минутах
}

function invertIntervals(schedule) {
    var result = {};
    for (var i in schedule) {
        result[i] = [];
    }
    for (var i in schedule) {
        var arrayOfIntervals = [];
        for (var j in schedule[i]) {
            arrayOfIntervals.push(schedule[i][j].from, schedule[i][j].to);
        }
        arrayOfIntervals.unshift([0, 0, 1]);
        arrayOfIntervals.push([23, 59, arrayOfIntervals[arrayOfIntervals.length - 1][2]]);
        for (var j = 0; j < arrayOfIntervals.length; j++) { // разбиваем по суткам
            if (typeof arrayOfIntervals[j + 1] === 'undefined') {
                break;
            }
            if (arrayOfIntervals[j][2] !== arrayOfIntervals[j + 1][2] &&
                arrayOfIntervals[j][0] !== 23 && arrayOfIntervals[j + 1][0] !== 0 && !(j % 2)) {
                arrayOfIntervals.splice(j + 1, 0, [23, 59, arrayOfIntervals[j][2]]);
                arrayOfIntervals.splice(j + 2, 0, [0, 0, arrayOfIntervals[j][2] + 1]);
            }
        }
        for (var j = 0; j < arrayOfIntervals.length; j+= 2) {
            result[i].push({
                from: arrayOfIntervals[j],
                to: arrayOfIntervals[j + 1]
            });
        }
    }
    return result;
}

// Выбирает подходящий ближайший момент начала ограбления
module.exports.getAppropriateMoment = function (json, minDuration, workingHours) {
    var appropriateMoment = moment();

    // 1. Читаем json
    // 2. Находим подходящий ближайший момент начала ограбления
    // 3. И записываем в appropriateMoment

    // ВСЁ В UTC
    var bankSchedule = {
        1: {},
        2: {},
        3: {}
    };
    var offset = sliceAndParse(workingHours.from, 5);
    var workingHoursUTC = convertToUTC(workingHours, offset);
    for (var i in bankSchedule) {
        bankSchedule[i].from = workingHoursUTC.from;
        var anyDate = new Date();
        setHHMM(anyDate, workingHoursUTC.to);
        anyDate.setMinutes(anyDate.getMinutes() - minDuration);
        bankSchedule[i].to = [anyDate.getHours(), anyDate.getMinutes()];
    }
    var freeTime = invertIntervals(fillSchedule(JSON.parse(json)));
    for (var i in bankSchedule) {
        var thatDayIntervals = [bankSchedule[i]];
        for (var j in freeTime) {
            for (var k in freeTime[j]) {
                if (freeTime[j][k].from[2] === i) {
                    thatDayIntervals.push(freeTime[j][k]);
                }
            }
        }
        var thatDayDates = [];
        for (var j in thatDayIntervals) {
            var startDateTime = new Date();
            var endDateTime = new Date();
            setHHMM(startDateTime, thatDayIntervals[j].from);
            setHHMM(endDateTime, thatDayIntervals[j].to);
            thatDayDates.push({
                from: startDateTime,
                to: endDateTime
            });
        }
        var theBeginning = new Date(0);
        var theEnd = thatDayDates[0].to;
        for (var j in thatDayDates) { // самое позднее начало, самое раннее окончание
            if (thatDayDates[j].from > theBeginning) {
                theBeginning = thatDayDates[j].from;
            }
            if (thatDayDates[j].to < theEnd) {
                theEnd = thatDayDates[j].to;
            }
        }
        if (durationBetween(theBeginning, theEnd) >= 90) {
            appropriateMoment.date = theBeginning;
        }
    }

    return appropriateMoment;
};

// Возвращает статус ограбления (этот метод уже готов!)
module.exports.getStatus = function (moment, robberyMoment) {
    if (moment.date < robberyMoment.date) {
        // «До ограбления остался 1 день 6 часов 59 минут»
        return robberyMoment.fromMoment(moment);
    }

    return 'Ограбление уже идёт!';
};
