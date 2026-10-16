.PHONY: build serve images clean

build:   ## silver -> gold
	python3 scripts/build.py

serve: build   ## build + servidor local
	python3 -m http.server 8000 -d gold

images:  ## bronze -> silver (optimiza imágenes)
	python3 scripts/optimize_images.py

clean:
	rm -rf gold/assets gold/index.html
