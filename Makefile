PATH?=$(CURDIR)/debug

run:
	/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
	--user-data-dir=$(PATH)/chrome-tabboost-dev \
	--disable-sync \
	--auto-open-devtools-for-tabs \
	--load-extension=$(CURDIR)/build