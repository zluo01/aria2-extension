# Aria2 Integration Web extension

Web extension for Aria2

## Installation

- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/aria2-integration-extension/?utm_content=addons-manager-reviews-link&utm_medium=firefox-browser&utm_source=firefox-browser)
- [Chrome](https://chrome.google.com/webstore/detail/aria2-integration-extensi/chehmbmmchaagpilhabnocngnmjllgfi?hl=en&authuser=0)

## Features

- Replace browser default download manager with Aria2
- Add, start, pause and stop jobs in extension tab
- Trigger download with right click context menu
- Allow more operations with integrated AriaNg
- Custom configuration allows instance other than default aria2 domains & ports
- Third party scripts support, allow user to add scripts using integrated editor. (Removed after **0.5.0**, see below)

## Scripts

> This feature is **removed** after 0.5.0 due to manifest 3 does not allow arbitrary code execution per [guideline](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security).

The new script extension allows user to download certain resources on websites without going into page source manually.

### Example

```
(async function (url) {
    'use strict';

    const res = await fetch(url);
    if (res.ok) {
        const data = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, "text/html");
        const matches = doc.querySelector("<SOME-QUERY-SELECTOR>");
        return matches.src;
    }
    throw res.statusText;
})();
```

<p>
With the input url as a parameter, user should be able to implement scripts utilize xPath or query selector to find out media sources or batch images on define domains 
and download all automatically in batch.
</p>

## Todo

- Allow multiple Aria2 instances, currently only support one instance.
- Background job monitor.

## Reference

- https://github.com/aria2/aria2
- https://github.com/mayswind/AriaNg
- https://github.com/sonnyp/aria2.js/
- https://github.com/RossWang/Aria2-Integration
