# svgmule (work in progress)

SVG asset management made simple. Combines and optimizes your original SVG's on a per folder basis into one single file each.

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
```

<body>
    <% include "_build/global.svg" %>
    <% include "_build/pages.${page_name}.svg" %>
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

Feedback welcome! Contact me [@bennyschudel](http://twitter.com/bennyschudel).

#### LEGAL
Copyright (c) 2014 Benny Schudel - [MIT-License](https://raw.github.com/bennyschudel/node-svgmule/master/LICENSE)