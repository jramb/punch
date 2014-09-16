all: punch.min.js

#%.js: %.ls
#	lsc -c $^
%.js: %.ts
	tsc $^

%.min.js: %.js
	uglifyjs $^ >$@
	cp $@ ~/semper/
