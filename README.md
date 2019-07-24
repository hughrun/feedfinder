# feedfinder

nodejs package for finding RSS and Atom feeds from a given URL and vice-versa

[Reporting bugs or proposing changes](contributing.md)  
[Usage](#usage)  
[Methods](#methods)  
[Caveats](#caveats)

## Usage

To install:

```bash
npm install @hughrun/feedfinder
```

In your code:

```javascript
const feedfinder = require('@hughrun/feedfinder')

feedfinder.getFeed(url)
  .then( x => {
    console.log(x)
    // returns an object
  })
  .catch( e => {
    console.error(e)
    // return a string
  })

  feedfinder.getSite(feed)
    .then( x => {
      console.log(x)
      // returns an object
    })
    .catch( e => {
      console.error(e)
      // returns a string
    })
```

## Methods

All _feedfinder_ methods are Promises.

### getFeed

`getFeed(url)` takes a full url (i.e. including protocol) and returns an object with the given url, the feed url, and the site name, or alternatively returns an error in the form of a string.

Examples:

```javascript
feedfinder.getFeed('http://hughrundle.net')
/*  
returns:
    {
      url: 'https://hughrundle.net',
      feed: 'https://www.hughrundle.net/rss/',
      title: 'Information Flaneur'
    }
*/

feedfinder.getFeed('http://nla.gov.au')
//  returns error: 'No link to RSS or Atom feed found at this URL'

feedfinder.getFeed("https://www.example.com")
// returns error: 'URL cannot be found'

```

Note that the error message is returned as an error - so if you don't catch it, nothing is returned.

### getSite

`getSite()` take a full feed URL and returns an object with the site url, the provided feed url, and the site name, or alternatively returns an error in the form of a string.

Examples:

```javascript
feedfinder.getSite('https://www.hughrundle.net/rss')
/*
Returns:'
  {
    url: 'https://www.hughrundle.net/',
    feed: 'https://www.hughrundle.net/rss',
    title: 'Information Flaneur'
  }
*/

feedfinder.getSite('https://www.hughrundle.net')
// returns: 'No RSS or Atom file found at this URL'

feedfinder.getSite("https://www.example.com/rss")
// returns error: 'URL cannot be found'

```

## Caveats

Well-formed web pages will list their RSS/Atom feed in a `<link>`element in the head, however sometimes there is a feed for a page but it is not referred to in a head `<link>` element. In this case, _feedfinder_ looks in the body of the page for anchor links (i.e. `<a>` elements) that look like they might point to feeds. If there is more than one link to a likely feed, _the first one listed will be used_. This is likely to be what you want, but there is only so much that can be done with poorly-structured pages so ...it might not.

YouTube users, channels and playlists should all work as long as YouTube does not change the way it constructs RSS feeds - they are not listed on pages, but as the form is known, we can construct them from the ID.
