# Indie Wiki Buddy
Indie Wiki Buddy is a browser extension that automatically notifies and redirects you from wikis on large, corporate-run wiki farms to independent wikis.

Work in progress! Source code coming soon.

----

Large, corporate-run wiki farms have enabled hundreds of great wikis and communities. Unfortunately, these wiki farms can easily overshadow quality independent wikis, especially in search engine results. Independent wikis often have the benefit of greater self-determination and fewer ads, but are easily missed by users who aren't aware of their existence.

When visiting a wiki on a large corporate wiki farm such as Fandom, Indie Wiki Buddy will notify and/or automatically redirect you if a quality, independent alternative is available. You can customize your experience per-wiki.

# Contributing wikis

Contributions are welcome and encouraged! You can either open a pull request to add a new wiki, or [open an issue](https://github.com/KevinPayravi/indie-wiki-buddy/issues/new?assignees=KevinPayravi&labels=add+wiki&template=request-a-wiki-be-added.md&title=Add+a+wiki%3A+WIKI+NAME).

## Criteria for inclusion
* The destination wiki should be independent, meaning that decisioning and control of the wiki largely rests with the wiki's staff and volunteer editing community. Factors include editorial independence, the editorbase's ability to request changes from their host, and any history of the host exerting decisions contrary to a wiki community's wishes.
  * Miraheze wikis may be considered independent, due to Miraheze's openness, customizability, and ability for wikis to migrate off the platform.
* The destination wiki should be of decent quality, ideally matching (or exceeding) the quality and size of the origin wiki. While we want to support all independent wikis, we also want extension users to be directed to wikis where they can find what they are looking for.
* When there are multiple independent wikis on the same subject, we will usually point to the wiki that is most complete and prominent in the community.

## Technical details
Wiki data is located in JSON files in the [data](data) folder, one file per language.

Entries are formatted as follows:
```
{
  "origin": "Example Fandom Wiki",
  "origin_base_url": "example.fandom.com",
  "origin_content_path": "/wiki/",
  "destination": "Example Wiki",
  "destination_base_url": "example.com",
  "destination_api_path": "/w/",
  "destination_platform": "mediawiki",
  "destination_icon": "example.png"
}
```

`destination_api_path` varies by wiki, but is usually `/` or `/w/`.
Supported `destination_platform`s are `mediawiki` and `doku`. If you are contributing an independent wiki that is on another wiki platform, please open an issue so that support for the platform can be added.

Favicons should be uploaded as 16px PNGs inside the [favicons](favicons) folder.
