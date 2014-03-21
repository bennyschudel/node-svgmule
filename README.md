# svgmule (work in progress)

SVG asset management made simple. Combines and minimizes your original SVG's on a per folder basis into one single file each.

> svgmule --config '{"input_dir":"assets/"}'

turns
```
.
└── assets
    ├── global
    │   ├── logo.svg
    │   ├── icon--help.svg
    │   ├── icon--menu.svg
    │   ├── icon--heart.svg
    └── pages
        └── home
            ├── welcome.svg
            └── mule.svg
```

into
```
.
├── _build
|   ├── global.svg
|   └── pages.home.svg
└── assets
    | ...

```

ready to be included
```html
<body>
    <? include "_build/global.svg" ?>
    <? include "_build/pages.${page_name}.svg" ?>
    ...
```

and to be used in your html
```html
<style>
	.logo {
		width  : 96px;
		height : 64px;
	}
</style>

<svg class="logo">
	<use xlink:href="#svg-logo"/>
</svg>
```

more in details soon.


## Configuration

Please check [defaults.yml](https://github.com/bennyschudel/node-svgmule/blob/master/lib/defaults.yml) for a list of available options.

The configuration itself can be either done either via a config file in the root folder

> svgmule.yml, .svgmule.yml

or by providing a JSON string as an argument.

> svgmule --config '{"input_dir":"assets/"}'


## Minification / Optimization

SVG minification is done via [svgo (svgmin)](https://github.com/svg/svgo) from [@deepsweet](https://github.com/deepsweet).


## About

Feedback welcome! Contact me [@bennyschudel](https://github.com/bennyschudel) or follow me on [twitter](http://twitter.com/bennyschudel).

#### Legal
Copyright (c) 2014 Benjamin Schudel - [MIT-License](https://raw.github.com/bennyschudel/node-svgmule/master/LICENSE)