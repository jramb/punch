#!/usr/bin/env lsc
/* 2014 by J Ramb */

#require! _: 'underscore'
require! <[ readline fs os child_process ]>
{ each, map } = require \prelude-ls

println = console.log

pad2 = (d) -> if d<10 then "0#d" else "#d"

if !Date.prototype.clock-text
  Date.prototype.clock-text = ->
    d = <[ \Sun \Mon \Tue \Wed \Thu \Fri \Sat ]>[@getDay!]
    "#{@getFullYear()}-#{pad2 @getMonth! + 1}-#{pad2 @getDate!} #d #{pad2 @getHours!}:#{pad2 @getMinutes!}" ;

if !Date.prototype.clock-text-date
  Date.prototype.clock-text-date = ->
    @clock-text!substring 0, 10


start-date = new Date!
clockfile=process.env.CLOCKFILE
backupfile="#clockfile-#{start-date.clock-text!substring 0, 10}"
tmpfile="#clockfile-#{start-date.clock-text!replace /[^0-9]/g ''}"


# CLOCK: [2013-06-14 Fri 09:00]--[2013-06-14 Fri 17:00] =>  8:00
date-match     = /\d{4}-\d{2}-\d{2}/
time-match     = /\d{2}:\d{2}/
duration-match = /-?\d+:\d{2}/
date-time-match= new RegExp "(#{date-match.source} [a-z]{2,3} #{time-match.source})", \i
clock-match    = new RegExp "CLOCK: \\[#{date-time-match.source}\\](--\\[#{date-time-match.source}\\]( =>\\s*(#{duration-match.source}))?)?", \i
header-match   = /^(\*+)\s+(.*)$/
date-time-match-det = /(\d{4})-(\d{2})-(\d{2}) [a-z]{2,3} (\d{2}):(\d{2})/i

parse-date-time = (dt) ->
  if dt
    parts = dt.match date-time-match-det
    if parts
      new Date parts[1], +parts[2]-1, parts[3], parts[4], parts[5]


parse-line = (line, deep) ->
  if (h = line.match /^(\*+)\s+(.*)$/)
    type:   \header
    deep:   h[1].length
    header: h[2]
    text:   line
  else if (ar = line.match clock-match)
    # CLOCK: [2013-06-14 Fri 09:00]--[2013-06-14 Fri 17:00] =>  8:00
    s = parse-date-time ar[1]
    e = parse-date-time ar[3]
    type: \clock
    start: s
    end: e
    duration: (e - s)/1000/60 if e
    text: line
    deep: deep
  else
    type: \text
    text: line



duration-text = (d) ->
  m = d %% 60
  d = if d>0 then d - m else d + m
  d = d / 60 + ""
  d = " " * (2-d.length >? 0) + d
  "#d:#{pad2 m}"


generate-line = (line-code) ->
  switch line-code.type
    case \header
      \* * line-code.deep + ' ' + line-code.header
    case \clock
      # CLOCK: [2013-06-14 Fri 09:00]--[2013-06-14 Fri 17:00] =>  8:00
      ctxt = " " * line-code.deep + " CLOCK: [#{line-code.start.clock-text!}]"
      if line-code.end
        ctxt = ctxt + "--[#{line-code.end.clock-text!}] => #{duration-text line-code.duration}"
      ctxt
    default
      line-code.text


save-time-data = (data) ->
  println "save-time-data: #tmpfile"
  if !fs.exists-sync backupfile
    fs.rename-sync clockfile, backupfile
    println "Backup created: #backupfile"
  println "Start writing"
  out = fs.create-write-stream tmpfile #clockfile
  out.on \error, ->
    println "Error: #it"
  out.on \finish, ->
    println "Finish event"
    if fs.exists-sync clockfile
      fs.unlink clockfile, (err) ->
        if err
          println "** Could not remove #clockfile"
          process.exit 1
        fs.rename-sync tmpfile, clockfile
        println "All written"
    else
      fs.rename-sync tmpfile, clockfile

  each ((it) !-> out.write generate-line(it)+"\n" ), data
  println "Finished writing"
  out.end!


# load time-file into memory
load-time-file = (cb, params) !->
  if !clockfile or !fs.exists-sync clockfile
    println "You need to set the environment variable CLOCKFILE (pointing to an existing file)"
    process.exit 1
  current-deep = 0
  file-data = []
  rd = readline.create-interface {
    input: fs.create-read-stream clockfile
    output: process.stdout
    terminal: false
  }

  rd.on \line, (line) !->
    l = parse-line line, current-deep
    file-data.push l
    if l.deep then current-deep := l.deep

  # finally the callback
  rd.on \close, !-> cb file-data, params


# calculate a from and to date depending on the date-filter parameter
calc-from-to = (date-filter) ->
  # possible values: today, lastmonth, week, thisyear-1, today-20, week+2...
  if date-filter[0]
    mtch = date-filter[0].match /^(this|last)?(month|week|year|today|all)([+-]\d+)?$/i
    [ null, pre, unit, mod ] = mtch
  pre ?= \this
  unit ?= \month
  mod ?= 0
  mod = +mod
  mod -= 1 if pre=="last"
  #println "#pre #unit #mod"
  [y,m,d] = [start-date.getFullYear!, start-date.getMonth!, start-date.getDate!]
  [y1,y2,m1,m2,d1,d2] =
    switch unit.toLowerCase!
      case \today
        [y, y, m, m, d+mod, d+mod+1]
      case \month
        [y, y, m+mod, m+mod+1, 1, 1]
      case \year
        [y+mod, y+mod+1, 0, 0, 1, 1]
      default
        [0, 3000, 0, 0, 1, 1]
  [(new Date y1, m1, d1) , new Date y2, m2, d2]

summarize = (data, date-filter) !->
  var last-header
  [f-from, f-to] = calc-from-to date-filter
  data[0].info = f-from.clock-text-date! + " -- " + f-to.clock-text-date!
  for l in data
    if l.duration and l.start>=f-from and l.start<f-to
      last-header.sum += l.duration
    if l.type == \header
      last-header = l
      last-header.sum = 0

list-headers = (data, date-filter) !->
  summarize data, date-filter
  println data[0].info
  for l in data
    if l.type == \header
      println \* * l.deep + " #{l.header}" +
        if l.sum  and l.sum > 0
        then  " [#{duration-text l.sum}]"
        else ""

/* ********************************** */


main = (argv) ->

  argv.shift!
  argv.shift!
  cmd = argv.shift!
  switch cmd
    case \diff
      child = child_process.spawn('gvimdiff',[clockfile, backupfile], {detached: yes});
      child.on \close, -> println "command ended"
      println argv
    case \ls
      load-time-file list-headers, argv
    case \rewrite
      load-time-file save-time-data
    default
      println """
Usage: punch <cmd> {<options>}*
"""
  #each ((val, x) !-> println "#val #x"), argv
  #i=0
  #for x in argv
    #println i++ + ": " ++ x
  #return 0

#process.exit
main process.argv

