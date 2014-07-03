punch
=====

Command line tool to manage CLOCK entries in an org-mode file. The focus and main usage is to use it
as an easy tool to punch in and out to record working time.

You can punch in (start a CLOCK entry) under every header of the file. Headers are selected by 
giving the header text (or sufficient part of it) as a parameter on the command line.


Installation
------------

* Install node (http://nodejs.org/download/)
* `npm install livescript` (optional!)
* place `punch.ls` or `punch.js` somewhere on your system
You only need one of these files, take the js version if you are not interested in LiveScript.
* Create an org-mode file with at least one Header see below
* Add an environment variable `CLOCKFILE` which points to your org-mode CLOCK file
* create a commando `punch` or `p` which executes `node punch.js` or `node punch.ls` (you only need one of these)
* FIXME: Windows instructions

Example org-file, headers start with an asterix. Add an empty line in the end of the file!
```
* Work
** ProjectA
** ProjectB

```

2014-06-30
----------
I started to rewrite this into a nodejs program (using LiveScript.net), which makes everything
easier and quicker.

OLD
---
The program is a Bash script file `punch`. You need to set the env variable `CLOCKFILE` to point to an *existing* file
which contains at least one header (a line starting with `*`).


Installation (old)
------------

* Place in your path
* `chmod a+x punch`
* Add an environment variable `CLOCKFILE` which points to your org-mode CLOCK file

Usage
-----
`punch in <section>` to punch in. A matching part of the section (section title) is enough, the first
matching section is used.

`punch out` to punch out.

`punch show` to show (summarized) worked times. This takes a parameter to define the timespan to be shown,
very much like the one used in org-mode. For example: `today`, `thismonth` (default), `month-1`, `year`,
`lastweek`, `week-1`, etc..

`punch running` shows the currently running time

`punch help` for more info.



