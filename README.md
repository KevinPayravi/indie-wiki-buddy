# Indie Wiki Buddy

Indie Wiki Buddy is a browser extension that automatically notifies and redirects you from wikis on large, corporate-run wiki farms to independent wikis.

* Learn more at [getindie.wiki](https://getindie.wiki/).
* [Download for Firefox](https://addons.mozilla.org/en-US/firefox/addon/indie-wiki-buddy/)
* [Download for Chrome](https://chrome.google.com/webstore/detail/indie-wiki-buddy/fkagelmloambgokoeokbpihmgpkbgbfm)

![DE wikis](https://img.shields.io/badge/dynamic/json?style=flat-square&label=DE%20wikis&query=length&url=https%3A%2F%2Fraw.githubusercontent.com%2FKevinPayravi%2Findie-wiki-buddy%2Fmain%2Fdata%2FsitesDE.json)
![EN wikis](https://img.shields.io/badge/dynamic/json?style=flat-square&label=EN%20wikis&query=length&url=https%3A%2F%2Fraw.githubusercontent.com%2FKevinPayravi%2Findie-wiki-buddy%2Fmain%2Fdata%2FsitesEN.json)
![ES wikis](https://img.shields.io/badge/dynamic/json?style=flat-square&label=ES%20wikis&query=length&url=https%3A%2F%2Fraw.githubusercontent.com%2FKevinPayravi%2Findie-wiki-buddy%2Fmain%2Fdata%2FsitesES.json)
![FR wikis](https://img.shields.io/badge/dynamic/json?style=flat-square&label=FR%20wikis&query=length&url=https%3A%2F%2Fraw.githubusercontent.com%2FKevinPayravi%2Findie-wiki-buddy%2Fmain%2Fdata%2FsitesFR.json)
![IT wikis](https://img.shields.io/badge/dynamic/json?style=flat-square&label=IT%20wikis&query=length&url=https%3A%2F%2Fraw.githubusercontent.com%2FKevinPayravi%2Findie-wiki-buddy%2Fmain%2Fdata%2FsitesIT.json)
![PL wikis](https://img.shields.io/badge/dynamic/json?style=flat-square&label=PL%20wikis&query=length&url=https%3A%2F%2Fraw.githubusercontent.com%2FKevinPayravi%2Findie-wiki-buddy%2Fmain%2Fdata%2FsitesPL.json)
![TOK wikis](https://img.shields.io/badge/dynamic/json?style=flat-square&label=TOK%20wikis&query=length&url=https%3A%2F%2Fraw.githubusercontent.com%2FKevinPayravi%2Findie-wiki-buddy%2Fmain%2Fdata%2FsitesTOK.json)

![Mozilla Add-on](https://img.shields.io/amo/v/indie-wiki-buddy?style=flat-square&color=%23cb553f&label=firefox%20version&logo=firefox)
![Mozilla Add-on](https://img.shields.io/amo/users/indie-wiki-buddy?style=flat-square&color=%23cb553f&label=firefox%20downloads&logo=firefox)
![Mozilla Add-on](https://img.shields.io/amo/stars/indie-wiki-buddy?style=flat-square&color=%23cb553f&label=firefox%20rating&logo=firefox)

![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fkagelmloambgokoeokbpihmgpkbgbfm?style=flat-square&color=%234285f4&label=chrome%20version&logo=google-chrome)
![Chrome Web Store](https://img.shields.io/chrome-web-store/users/fkagelmloambgokoeokbpihmgpkbgbfm?style=flat-square&color=%234285f4&label=chrome%20downloads&logo=googlechrome)
![Chrome Web Store](https://img.shields.io/chrome-web-store/stars/fkagelmloambgokoeokbpihmgpkbgbfm?style=flat-square&color=%234285f4&label=chrome%20rating&logo=googlechrome)

----

Large, corporate-run wiki farms have enabled hundreds of great wikis and communities. Unfortunately, these wiki farms can easily overshadow quality independent wikis, especially in search engine results. Independent wikis often have the benefit of greater self-determination and fewer ads, but are easily missed by users who aren't aware of their existence.

When visiting a wiki on a large corporate wiki farm such as Fandom, Indie Wiki Buddy will notify and/or automatically redirect you if a quality, independent alternative is available. You can customize your experience per-wiki.

In addition, search results in Google, Bing, and DuckDuckGo can also be filtered, replacing non-independent wikis with text inviting you to visit the independent counterpart.

Indie Wiki Buddy also supports [BreezeWiki](https://breezewiki.com/), a service that renders Fandom wikis without ads or bloat. This helps give you a more enjoyable reading experience on Fandom when an independent wiki isn't available.

# Adding wikis

Contributions are welcome and encouraged! You can either open a pull request to add a new wiki, or [open an issue](https://github.com/KevinPayravi/indie-wiki-buddy/issues/new?assignees=KevinPayravi&labels=add+wiki&template=request-a-wiki-be-added.md&title=Add+a+wiki%3A+WIKI+NAME).

## Criteria for inclusion
* The destination wiki should be independent, meaning that decisioning and control of the wiki largely rests with the wiki's staff and volunteer editing community. Factors include editorial independence, the editorbase's ability to request changes from their host, and any history of the host exerting decisions contrary to a wiki community's wishes.
  * Miraheze wikis may be considered independent, due to the organization being non-profit, allowing for self-configuration, and providing the ability for wikis to migrate off the platform.
  * wiki.gg wikis are not considered independent. There is a separate "Redirect to wiki.gg" extension available for [Chrome](https://chrome.google.com/webstore/detail/redirect-to-wikigg/cngoemokfjekjkmajenlaokhnmmiinca) and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/redirect-to-wiki-gg/) that you can use alongside Indie Wiki Buddy. 
* The destination wiki should be of decent quality, ideally matching (or exceeding) the quality and size of the origin wiki. While we want to support all independent wikis, we also want extension users to be directed to wikis where they can find what they are looking for.
* When there are multiple independent wikis on the same subject, we will usually point to the wiki that is most complete and prominent in the community.

## Data
Wiki data is located in JSON files in the [data](data) folder, one file per language.

Entries are formatted as follows:
```
{
  "id": "en-example",
  "origin": "Example Fandom Wiki",
  "origin_base_url": "example.fandom.com",
  "origin_content_path": "/wiki/",
  "destination": "Example Wiki",
  "destination_base_url": "example.com",
  "destination_content_path": "/w/",
  "destination_platform": "mediawiki",
  "destination_icon": "example.png"
}
```

* `id`: A unique identifier for the wiki; should start with the two-letter language code for the wiki, followed by a hypen and the name of the subject/franchise the wiki covers.
* `origin`: Name of the wiki being redirected.
* `origin_base_url`: Fully qualified domain name of the wiki being redirected.
* `origin_content_path`: The URL path prefix for article links on the wiki being redirected. On MediaWiki wikis, it can be found at Special:Version. Fandom wikis are usually `/wiki/`.
* `destination`: Name of the wiki being redirected to.
* `destination_base_url`: Fully qualified domain name of the wiki being redirected to.
* `destination_content_path`: The URL path prefix for article links on the wiki being redirected to. On MediaWiki wikis, it can be found at Special:Version. It is typically `/wiki/` or `/`.
* `destination_platform`: The wiki's software. The current supported options are `mediawiki` and `doku`. If you are contributing a wiki that is on another wiki platform, please open an issue so that support for the platform can be added.
* `destination_icon`: The name of the wiki's favicon in the [favicons](favicons) folder.

Favicons should be uploaded as 16px PNGs inside the [favicons](favicons) folder.
