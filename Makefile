all: punch.js

%.js: %.ls
	lsc -c $^

