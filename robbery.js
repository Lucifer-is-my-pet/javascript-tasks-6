'use strict';

var moment = require('./moment');

function cutTheTime(string, index) {
    return parseInt(string.slice(index, index + 2));
}

function convertToUTC(schedule, offset, withDayOfTheWeek) {
    var result = {
        from: [],
        to: []
    };
    var index = 0;
    if (withDayOfTheWeek) {
        index += 3;
    }
    var hoursFrom = schedule['from'].slice(index, 2 + index);
    var hoursTo = schedule['to'].slice(index, 2 + index);
    var newFrom = new Date(2015, 0, 1, hoursFrom - offset, cutTheTime(schedule['from'], 3 + index));
    var newTo = new Date(2015, 0, 1, hoursTo - offset, cutTheTime(schedule['to'], 3 + index));
    result.from.push(newFrom.getHours(), newFrom.getMinutes());
    result.to.push(newTo.getHours(), newTo.getMinutes());

    if (withDayOfTheWeek) {
        var week = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
        var dayFrom = week.indexOf(schedule['from'].slice(0, 2));
        result.from.push(dayFrom);
        var dayTo = week.indexOf(schedule['to'].slice(0, 2));
        result.to.push(dayTo);
    }
    return result;
}

function setHHMM(time, arrayOfSettings, dayOfTheWeek) {
    time.setHours(arrayOfSettings[0]);
    time.setMinutes(arrayOfSettings[1]);
    if (typeof dayOfTheWeek !== 'undefined') {
        while (time.getDay() !== dayOfTheWeek) {
            time.setDate(time.getDate() + 1);
        }
        //console.log(time, dayOfTheWeek);
    }
}

function fillSchedule(schedule) {
    var result = {};
    for (var i in schedule) {
        result[i] = [];
    }
    for (var i in schedule) {
        var offset = cutTheTime(schedule[i][0]['from'], 8);
        for (var j in schedule[i]) {
            result[i].push(convertToUTC(schedule[i][j], offset, true));
        }
    }
    return result;
}

function durationBetween(from, to) {
    var duration = to - from;
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
        for (var j = 0; j < arrayOfIntervals.length; j += 2) {
            result[i].push({
                from: arrayOfIntervals[j],
                to: arrayOfIntervals[j + 1]
            });
        }
    }
    return result;
}

function areEqual(firstObject, secondObject) {
    return JSON.stringify(firstObject) === JSON.stringify(secondObject);
}

function indexOfObject(arrayOfArrays, array) {
    for (var i = 0; i < arrayOfArrays.length; i++) {
        var isInArray = false;
        for (var j = 0; j < arrayOfArrays[i].length; j++) {
            if (areEqual(arrayOfArrays[i][j], array[j])) {
                isInArray = true;
            } else {
                isInArray = false;
                break;
            }
        }
        if (isInArray) {
            return i;
        }
    }
    return -1;
}

function findAllCombinations(listOfIntervals) { // задача: вернуть несколько массивов интервалов
    var numOfCombinations = 1;
    for (var i in listOfIntervals) {
        numOfCombinations *= listOfIntervals[i].length;
    }
    var listOfIndexes = {};
    var k = 0;
    for (var i in listOfIntervals) { // list не индексируется, result - да
        listOfIndexes[k] = i;
        k++;
    }
    var result = [];
    result[0] = [];
    for (var i in listOfIntervals) {
        result[0].push(listOfIntervals[i][0]);
    }
    var listLength = Object.keys(listOfIntervals).length;
    for (var i = 0; i < numOfCombinations - 1; i++) {
        var newCombination = new Array(listLength);
        do {
            for (var j = 0; j < listLength; j++) {
                newCombination[j] = listOfIntervals[listOfIndexes[j]][Math.floor(Math.random() *
                    listOfIntervals[listOfIndexes[j]].length)];
            }
        } while (indexOfObject(result, newCombination) !== -1);
        result.push(newCombination);
    }
    return result;
}

// Выбирает подходящий ближайший момент начала ограбления
module.exports.getAppropriateMoment = function (json, minDuration, workingHours) {
    if (Object.keys(json).length === 0) {
        return null;
    }
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
    var offset = cutTheTime(workingHours.from, 5);
    appropriateMoment.timezone = offset;
    var workingHoursUTC = convertToUTC(workingHours, offset, false);
    for (var i = 1; i < 4; i++) {
        var anyDate = new Date();
        setHHMM(anyDate, workingHoursUTC.from);
        bankSchedule[i].from = [anyDate.getHours(), anyDate.getMinutes(), i];
        setHHMM(anyDate, workingHoursUTC.to);
        anyDate.setMinutes(anyDate.getMinutes() - minDuration);
        bankSchedule[i].to = [anyDate.getHours(), anyDate.getMinutes(), i];
    }
    var freeTime = invertIntervals(fillSchedule(JSON.parse(json)));
    for (var i in bankSchedule) {
        var thatDayIntervals = {bank: [bankSchedule[i]]};

        for (var j in freeTime) {
            for (var k in freeTime[j]) {
                if (freeTime[j][k].from[2] === parseInt(i)) {
                    thatDayIntervals[j] = thatDayIntervals[j] || [];
                    thatDayIntervals[j].push(freeTime[j][k]);
                }
            }
        }

        var keys = Object.keys(thatDayIntervals);
        keys.sort();
        var gangMembers = Object.keys(freeTime).sort();
        for (var j in gangMembers) {
            if (keys.indexOf(gangMembers[j]) === -1) {
                thatDayIntervals[gangMembers[j]] = thatDayIntervals[gangMembers[j]] || [];
                thatDayIntervals[gangMembers[j]].push({
                    from: [0, 0, parseInt(i)],
                    to: [23, 59, parseInt(i)]
                });
            }
        }
        //console.log(thatDayIntervals);
        var intervals = findAllCombinations(thatDayIntervals); // элемент - комбинация,
        // пробежаться по
        // ней, поискать пересечение. нашли - присвоили, домотали до нужного дня недели
        //for (var j in intervals) {
        //    console.log(intervals[j], '#');
        //}
        for (var j = 0; j < intervals.length; j++) {
            var thatDayDates = [];
            for (var k in intervals[j]) {
                var startDateTime = new Date(0);
                var endDateTime = new Date(0);
                setHHMM(startDateTime, intervals[j][k].from, intervals[j][k].from[2]);
                setHHMM(endDateTime, intervals[j][k].to, intervals[j][k].from[2]);
                thatDayDates.push({
                    from: startDateTime,
                    to: endDateTime
                });
            }
            //console.log(thatDayDates);
            var theBeginning = thatDayDates[0].from;
            var theEnd = thatDayDates[0].to;
            for (var k in thatDayDates) { // самое позднее начало, самое раннее окончание
                if (thatDayDates[k].from > theBeginning) {
                    theBeginning = thatDayDates[k].from;
                }
                if (thatDayDates[k].to < theEnd) {
                    theEnd = thatDayDates[k].to;
                }
            }
            //console.log('begin', theBeginning);
            //console.log('end', theEnd);
            if (durationBetween(theBeginning, theEnd) >= minDuration) {
                appropriateMoment.date = theBeginning;
                return appropriateMoment;
            }
        }
        //console.log('-------');
    }
    return null;
};

// Возвращает статус ограбления (этот метод уже готов!)
module.exports.getStatus = function (moment, robberyMoment) {
    if (moment.date < robberyMoment.date) {
        // «До ограбления остался 1 день 6 часов 59 минут»
        return robberyMoment.fromMoment(moment);
    }

    return 'Ограбление уже идёт!';
};
