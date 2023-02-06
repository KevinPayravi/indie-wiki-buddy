# Indie Wiki Buddy
Indie Wiki Buddy is a browser extension that automatically notifies and redirects you from wikis on large, corporate-run wiki farms to independent wikis.

* Learn more at [getindie.wiki](https://getindie.wiki/).
* [Download for Firefox](https://addons.mozilla.org/en-US/firefox/addon/indie-wiki-buddy/)
* Coming soon for Chrome
* Coming soon for Microsoft Edge

----

Large, corporate-run wiki farms have enabled hundreds of great wikis and communities. Unfortunately, these wiki farms can easily overshadow quality independent wikis, especially in search engine results. Independent wikis often have the benefit of greater self-determination and fewer ads, but are easily missed by users who aren't aware of their existence.

When visiting a wiki on a large corporate wiki farm such as Fandom, Indie Wiki Buddy will notify and/or automatically redirect you if a quality, independent alternative is available. You can customize your experience per-wiki.

In addition, search results in Google, Bing, and DuckDuckGo can also be filtered, replacing non-independent wikis with text inviting you to visit the independent counterpart.

Indie Wiki Buddy also supports [BreezeWiki](https://breezewiki.com/), a service that renders Fandom wikis without ads or bloat. This helps give you a more enjoyable reading experience on Fandom when an independent wiki isn't available.

# Adding wikis

Contributions are welcome and encouraged! You can either open a pull request to add a new wiki, or [open an issue](https://github.com/KevinPayravi/indie-wiki-buddy/issues/new?assignees=KevinPayravi&labels=add+wiki&template=request-a-wiki-be-added.md&title=Add+a+wiki%3A+WIKI+NAME).

## Criteria for inclusion
* The destination wiki should be independent, meaning that decisioning and control of the wiki largely rests with the wiki's staff and volunteer editing community. Factors include editorial independence, the editorbase's ability to request changes from their host, and any history of the host exerting decisions contrary to a wiki community's wishes.
  * Miraheze wikis may be considered independent, due to Miraheze's openness, customizability, and ability for wikis to migrate off the platform.
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
