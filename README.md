punch
=====

Command line tool to manage CLOCK entries in an org-mode file. The focus and main usage is to use it
as an easy tool to punch in and out to record working time.

2014-06-30
----------
I started to rewrite this into a nodejs program (using LiveScript.net).
This is not complete but will be much faster and should be more convenient in many ways.

OLD
---
The program is a Bash script file `punch`. You need to set the env variable `CLOCKFILE` to point to an *existing* file
which contains at least one header (a line starting with `*`).

You can punch in (start a CLOCK entry) under every section of the file. Sections are selected by 

Installation
------------

* Place in your path
* `chmod a+x punch`
* Add an environment variable `CLOCKFILE` which points to your org-mode CLOCK file

Usage
-----
`punch in <section>` to punch in. A matching part of the section (section title) is enough, the first
matching section is used.

`punch out` to punch out.

`punch help` for more info.



