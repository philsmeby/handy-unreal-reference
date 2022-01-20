clean:
	rm -rf ./docs/.vuepress/.cache
	rm -rf ./docs/.vuepress/.temp
	rm -rf ./docs/.vuepress/dist
	rm -rf ./node_modules

build:
	yarn docs:build

localrun: build
	yarn docs:dev