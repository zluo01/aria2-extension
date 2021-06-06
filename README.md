# Aria2 Integration Web extension

Web extension for Aria2

## Features

- Replace browser default download manager with Aria2
- Add, start, pause and stop jobs in extension tab
- Trigger download with right click context menu
- Allow more operations with integrated AriaNg
- Custom configuration allows instance other than default aria2 domains & ports
- Third party scripts support, allow user to add scripts using integrated editor.

## Scripts

The new script extension allows user to download certain resources on websites without going into page source manually.

For example, if one have domain filter as [exmaple.com](https://example.com). By applying the following code, one should
be able to change the website as google and download the html files.

```
(function(url) {
  'use strict';

  function changeDomain(){
    return url.replace('example', 'google');
  }

  return changeDomain();
})();
```

<p>
The previous example is just a very easy demonstration on how the script works. With the input url as a parameter, user
should be able to implement scripts utilize xPath search to find out media sources or batch images on define domains 
and download all automatically in batch.
</p>

## Todo

- Allow multiple Aria2 instances, currently only support one instance.
- Background job monitor.
- Import & export scripts to local.

## Reference

- https://github.com/aria2/aria2
- https://github.com/mayswind/AriaNg
- https://github.com/sonnyp/aria2.js/
- https://github.com/RossWang/Aria2-Integration
