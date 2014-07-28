all: punch.min.js

%.js: %.ls
	lsc -c $^

%.min.js: %.js
	uglifyjs $^ >$@
