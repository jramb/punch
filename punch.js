/* 2014 by J Ramb */
/// <reference path="node.d.ts" />

(function () {
    var config;
    var readline = require('readline');
    var fs = require('fs');
    var os = require('os');
    var child_process = require('child_process');
    var println = console.log;
    var startDate = new Date();
    var dateMatch = /\d{4}-\d{2}-\d{2}/;
    var timeMatch = /\d{2}:\d{2}/;
    var durationMatch = /-?\d+:\d{2}/;
    var dateTimeMatch = new RegExp("(" + dateMatch.source + " [a-z]{2,3} " + timeMatch.source + ")", 'i');
    var clockMatch = new RegExp("CLOCK: \\[" + dateTimeMatch.source + "\\](--\\[" + dateTimeMatch.source + "\\]( =>\\s*(" + durationMatch.source + "))?)?", 'i');
    var headerMatch = /^(\*+)\s+(.*)$/;
    var dateTimeMatchDet = /(\d{4})-(\d{2})-(\d{2}) [a-z]{2,3} (\d{2}):(\d{2})/i;

    function pad2(d) {
        if (d < 10) {
            return "0" + d;
        } else {
            return d + "";
        }
    }

    function clockText(dat) {
        var d = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dat.getDay()];
        return dat.getFullYear() + "-" + pad2(dat.getMonth() + 1) + "-" + pad2(dat.getDate()) + " " + d + " " + pad2(dat.getHours()) + ":" + pad2(dat.getMinutes());
    }

    function clockTextDate(dat) {
        return clockText(dat).substring(0, 10);
    }

    function getMonDay(d) {
        var day;
        day = d.getDay() - 1;
        if (day < 0) {
            return 6;
        } else {
            return day;
        }
    }

    config = {
        clockfile: process.env.CLOCKFILE,
        backupfile: "-" + clockText(startDate).substring(0, 10)
    };

    (function (configFile) {
        var that, configFIXME;
        if (fs.existsSync(configFile)) {
            if (that = fs.readFileSync(configFile)) {
                config = JSON.parse(that);
            }
        }
    }.call(this, 'punch.json'));

    function parseDateTime(dt) {
        var parts;
        if (dt) {
            parts = dt.match(dateTimeMatchDet);
            if (parts) {
                return new Date(parts[1], +parts[2] - 1, parts[3], parts[4], parts[5]);
            }
        }
    }

    function parseLine(line, deep) {
        var h, ar, s, e;
        if (h = line.match(/^(\*+)\s+(.*)$/)) {
            return {
                type: 'header',
                deep: h[1].length,
                header: h[2],
                text: line
            };
        } else if (ar = line.match(clockMatch)) {
            s = parseDateTime(ar[1]);
            e = parseDateTime(ar[3]);
            return {
                type: 'clock',
                start: s,
                end: e,
                duration: e ? (e - s) / 1000 / 60 : void 8,
                text: line,
                deep: deep
            };
        } else {
            return {
                type: 'text',
                text: line
            };
        }
    }

    function repeatString$(str, n) {
        for (var r = ''; n > 0; (n >>= 1) && (str += str))
            if (n & 1)
                r += str;
        return r;
    }

    function durationText(d) {
        var m, ref$, ds;
        m = ((d) % (ref$ = 60) + ref$) % ref$;
        d = d > 0 ? d - m : d + m;
        ds = d / 60 + "";
        ds = repeatString$(" ", (ref$ = 2 - ds.length) > 0 ? ref$ : 0) + ds;
        return ds + ":" + pad2(m);
    }
    ;

    function generateLine(lineCode) {
        var ctxt;
        switch (lineCode.type) {
            case 'header':
                return repeatString$('*', lineCode.deep) + ' ' + lineCode.header;
            case 'clock':
                ctxt = repeatString$(" ", lineCode.deep) + (" CLOCK: [" + clockText(lineCode.start) + "]");
                if (lineCode.end) {
                    ctxt = ctxt + ("--[" + clockText(lineCode.end) + "] => " + durationText(lineCode.duration));
                }
                return ctxt;
            default:
                return lineCode.text;
        }
    }
    ;

    function closeClockLine(line) {
        if (!(line.start && !line.end)) {
            throw new Error("line " + line + " not a clock line or not open!");
        }
        line.end = startDate;
        line.end.setMilliseconds(0);
        line.end.setSeconds(0);
        return line.duration = (line.end - line.start) / 1000 / 60;
    }
    ;

    function saveTimeData(data) {
        var clockfile, backupfile, tmpfile, out, i$, len$, it;
        clockfile = config.clockfile;
        backupfile = clockfile + config.backupfile;
        tmpfile = clockfile + ("-" + clockText(startDate).replace(/[^0-9]/g, ''));
        if (!fs.existsSync(backupfile)) {
            fs.renameSync(clockfile, backupfile);
        }
        out = fs.createWriteStream(tmpfile);
        out.on('error', function (it) {
            println("Error: " + it);
            return process.exit(1);
        });
        out.on('finish', function () {
            if (fs.existsSync(clockfile)) {
                return fs.unlink(clockfile, function (err) {
                    if (err) {
                        println("** Could not remove " + clockfile);
                        process.exit(1);
                    }
                    return fs.renameSync(tmpfile, clockfile);
                });
            } else {
                return fs.renameSync(tmpfile, clockfile);
            }
        });
        for (i$ = 0, len$ = data.length; i$ < len$; ++i$) {
            it = data[i$];
            out.write(generateLine(it) + "\n");
        }
        return out.end();
    }
    ;

    function loadTimeFile(cb, params) {
        var clockfile, currentDeep, fileData, rd;
        clockfile = config.clockfile;
        if (!clockfile || !fs.existsSync(clockfile)) {
            println("You need to set the environment variable CLOCKFILE (pointing to an existing file)");
            process.exit(1);
        }
        currentDeep = 0;
        fileData = [];
        rd = readline.createInterface({
            input: fs.createReadStream(clockfile),
            output: process.stdout,
            terminal: false
        });
        rd.on('line', function (line) {
            var l;
            l = parseLine(line, currentDeep);
            fileData.push(l);
            if (l.deep) {
                currentDeep = l.deep;
            }
        });
        rd.on('close', function () {
            cb(fileData, params);
        });
    }
    ;

    function calcFromTo(dateFilter) {
        var mtch, pre, unit, mod, ref$, y, m, d, y1, y2, m1, m2, d1, d2;
        if (dateFilter) {
            mtch = dateFilter.match(/^(this|last)?(month|week|year|today|yesterday|all)([+-]\d+)?$/i);
            if (mtch) {
                pre = mtch[1], unit = mtch[2], mod = mtch[3];
            }
        }
        pre == null && (pre = 'this');
        unit == null && (unit = 'month');
        mod == null && (mod = 0);
        mod = +mod;
        if (pre === "last") {
            mod -= 1;
        }

        //ref$ = [startDate.getFullYear(), startDate.getMonth(), startDate.getDate()], y = ref$[0], m = ref$[1], d = ref$[2];
        y = startDate.getFullYear();
        m = startDate.getMonth();
        d = startDate.getDate();
        ref$ = (function () {
            switch (unit.toLowerCase()) {
                case 'today', 'yesterday':
                    return [y, y, m, m, d + mod, d + mod + 1];
                case 'week':
                    d -= getMonDay(startDate);
                    return [y, y, m, m, d + mod * 7, d + (mod + 1) * 7];
                case 'month':
                    return [y, y, m + mod, m + mod + 1, 1, 1];
                case 'year':
                    return [y + mod, y + mod + 1, 0, 0, 1, 1];
                default:
                    return [0, 3000, 0, 0, 1, 1];
            }
        }()), y1 = ref$[0], y2 = ref$[1], m1 = ref$[2], m2 = ref$[3], d1 = ref$[4], d2 = ref$[5];
        return [new Date(y1, m1, d1), new Date(y2, m2, d2)];
    }
    ;

    function summarize(data, dateFrom, dateTo, headerRe) {
        var lastHeader, dateToShow, i$, len$, l;
        var total = 0;
        dateToShow = new Date(dateTo.getTime());
        dateToShow.setDate(dateTo.getDate() - 1);
        if ((dateToShow.getTime() - dateFrom.getTime()) > 0) {
            data[0].info = clockTextDate(dateFrom) + " -- " + clockTextDate(dateToShow);
        } else {
            data[0].info = clockTextDate(dateFrom);
        }
        for (i$ = 0, len$ = data.length; i$ < len$; ++i$) {
            l = data[i$];
            if (l.duration && l.start >= dateFrom && l.start < dateTo && lastHeader.text.match(headerRe)) {
                lastHeader.sum += l.duration;
                total += l.duration;
            }
            if (l.type === 'header') {
                lastHeader = l;
                lastHeader.sum = 0;
            }
        }
        data[0].sum = total;
    }

    function listHeaders(data, argv) {
        var i, len, l;
        var dateFilter = argv[0];
        var headerLike = new RegExp(argv[1], "i");
        var ref$ = calcFromTo(argv[0]), dateFrom = ref$[0], dateTo = ref$[1];
        closeAll(data);
        summarize(data, dateFrom, dateTo, headerLike);
        println(data[0].info + ": [" + durationText(data[0].sum) + "]");
        for (i = 0, len = data.length; i < len; ++i) {
            l = data[i];
            if (l.type === 'header' && l.sum > 0 && l.header.match(headerLike)) {
                println(repeatString$('*', l.deep) + (" " + l.header) + (l.sum && l.sum > 0 ? " [" + durationText(l.sum) + "]" : ""));
            }
        }
    }

    function addDays(d, addDays) {
        if (typeof addDays === "undefined") { addDays = 1; }
        var d = new Date(d.getTime());
        d.setDate(d.getDate() + addDays);
        return d;
    }

    function listDays(data, argv) {
        var i, len, l;
        var dateFilter = argv[0];
        var headerLike = new RegExp(argv[1], "i");
        var ref$ = calcFromTo(argv[0]), dateFrom = ref$[0], dateTo = ref$[1];
        var datePlusOne;
        closeAll(data);
        while (dateFrom.getTime() < dateTo.getTime()) {
            datePlusOne = addDays(dateFrom);
            summarize(data, dateFrom, datePlusOne, headerLike);
            if (data[0].sum > 0) {
                println(data[0].info + ": [" + durationText(data[0].sum) + "]");
                for (i = 0, len = data.length; i < len; ++i) {
                    l = data[i];
                    if (l.type === 'header' && l.sum > 0 && l.header.match(headerLike)) {
                        println(repeatString$('*', l.deep) + (" " + l.header) + (l.sum && l.sum > 0 ? " [" + durationText(l.sum) + "]" : ""));
                    }
                }
            }
            dateFrom = addDays(dateFrom, 1);
        }
    }

    function closeAll(data) {
        var lastHeader, i$, len$, l;
        for (i$ = 0, len$ = data.length; i$ < len$; ++i$) {
            l = data[i$];
            if (l.type === 'header') {
                lastHeader = l;
            }
            if (l.type === 'clock' && !l.end) {
                data[0].modified = true;
                closeClockLine(l);
                println(lastHeader.text + " checked out: " + durationText(l.duration));
                println(generateLine(l) + "");
            }
        }
    }

    function closeAllTimes(data, params) {
        closeAll(data);
        if (data[0].modified) {
            saveTimeData(data);
        }
    }

    function checkIn(data, params) {
        var foundIdx, found, headerLike, i$, len$, idx, l, openLine;
        found = 0;
        if (!params[0]) {
            println("Need a header (or part of it) to check in");
            process.exit(1);
        }
        headerLike = new RegExp(params[0], "i");
        closeAll(data);
        for (i$ = 0, len$ = data.length; i$ < len$; ++i$) {
            idx = i$;
            l = data[i$];
            if (l.type === 'header' && l.text.match(headerLike)) {
                found++;
                println(l.text);
                foundIdx = idx;
            }
        }
        if (found === 0) {
            println("Found no matching header for " + params[0]);
        } else if (found > 1) {
            println("Found too many matching headers for " + params[0]);
        } else {
            openLine = {
                type: 'clock',
                start: startDate,
                deep: data[foundIdx].deep
            };
            data.splice(foundIdx + 1, 0, openLine);
            data[0].modified = true;
            println(generateLine(openLine) + " CHECKED IN");
            if (data[0].modified) {
                saveTimeData(data);
            }
        }
    }
    ;

    function prompt(data, params) {
        var lastHeader, i$, len$, l;
        for (i$ = 0, len$ = data.length; i$ < len$; ++i$) {
            l = data[i$];
            if (l.type === 'header') {
                lastHeader = l;
            }
            if (l.type === 'clock' && !l.end) {
                closeClockLine(l);
                println(lastHeader.header + ": " + durationText(l.duration) + "\\n");
            }
        }
    }
    ;

    /* ********************************** */
    function main(argv) {
        var cmd, backupfile, child;
        argv.shift();
        argv.shift();
        cmd = argv.shift();
        switch (cmd) {
            case 'diff':
                backupfile = config.clockfile + config.backupfile;
                if (fs.existsSync(backupfile)) {
                    child = child_process.spawn('gvimdiff', [backupfile, config.clockfile], {
                        detached: true
                    });
                    return child.on('close', function () {
                        return println("command ended");
                    });
                } else {
                    child = child_process.spawn('gvim', [config.clockfile], {
                        detached: true
                    });
                    return child.on('close', function () {
                        return println("command ended");
                    });
                }
                break;
            case 'sum':
            case 'ls':
            case 'show':
                return loadTimeFile(listHeaders, argv);
            case 'day':
            case 'days':
                return loadTimeFile(listDays, argv);
            case 'rewrite':
                return loadTimeFile(saveTimeData, argv);
            case 'out':
                return loadTimeFile(closeAllTimes, argv);
            case 'in':
                return loadTimeFile(checkIn, argv);
            case 'pro':
            case 'prompt':
                return loadTimeFile(prompt, argv);
            case 'ru':
            case 'running':
                return loadTimeFile(prompt, argv);
            default:
                return println("'punch' 2014 by jramb\n---------------------\nUsage: punch <command> {<opt>, ...}\n\ncommands:\n  h[elp]      Show this message\n  ls / show   lists tasks in clock filej\n  in <task>   Check in (start timer) for task (also stops all other timers)\n  out         Check out (stops ALL timers)\n\nYou need to set the environment variable CLOCKFILE (pointing to an existing file)");
        }
    }
    ;

    main(process.argv);
}).call(this);
