const assert = require('assert')
const feedfinder = require('../index.js')
const nock = require('nock')

// use nock to intercept http calls and return known data for tests
const google = nock('http://google.com').get('/').reply(404)
const siteUsingRSS = nock('http://good.site').persist().get('/').replyWithFile(200, __dirname + '/sites/rss.html')
const siteUsingAtom = nock('https://site-with-atom-feed.net').persist().get('/').replyWithFile(200, __dirname + '/sites/atom.html')
const siteWithRelativeRSS = nock('http://relative-feed-link.site').persist().get('/').replyWithFile(200, __dirname + '/sites/rss-relative.html')
const goodRss = nock('http://good.site').persist().get('/feed').replyWithFile(200, __dirname + '/sites/feed.xml')
const goodAtom = nock('http://good.atom.site').persist().get('/feed').replyWithFile(200, __dirname + '/sites/atom.xml')
const siteWithAnchor = nock('http://site-with-anchor-in-body.net').persist().get('/').replyWithFile(200, __dirname + '/sites/anchor.html')
const siteWithAtomAnchor = nock('http://atom-anchor.site').persist().get('/').replyWithFile(200, __dirname + '/sites/anchor-atom.html')
const siteWithRandomAnchor = nock('http://random-anchor.site').persist().get('/').replyWithFile(200, __dirname + '/sites/anchor-random.html')

// need this to test returnFeedInfo just by itself
const feedInfoInputData = {
  url: "http://www.example.com",
  feed: "http://www.example.com/rss",
  title: "My Awesome Blog"
}

const feedInfoInputWithRelative = {
  url: "http://www.example.com/",
  feed: "/rss.xml",
  title: "My Awesome Blog"
}

// pages to check
const isNotUrl = 'not-a-url'
const cannotBeReached = 'http://google.com'
const rss = 'http://good.site'
const atom = 'https://site-with-atom-feed.net'
const relativeLink = 'http://relative-feed-link.site'
const rssFeed = 'http://good.site/feed'
const atomFeed = 'http://good.atom.site/feed'
const pageWithAnchorToRSS = 'http://site-with-anchor-in-body.net'
const pageWithAnchorToAtom = 'http://atom-anchor.site'
const pageWithAnchorToRandom = 'http://random-anchor.site'

// TODO: probably should mock these since what we're testing is really that YouTube URLs will resolve
// even though they don't actually have feeds linked in the HTML
const youTubeChannel = "https://www.youtube.com/channel/UCdxpofrI-dO6oYfsqHDHphw" // YouTube Learning
const youTubeUser = "https://www.youtube.com/user/YouTube" // official YouTube user page
const youTubePlaylist = "https://www.youtube.com/playlist?list=PLbpi6ZahtOH7vgyGImZ4P-olTT11WLkLk" // YouTube Trending Today

// 'private' function returnFeedInfo
// NOTE: this is exported as __returnFeedInfo so it can be tested

describe('returnFeedInfo (private function)', function() {
  describe('the return value', function() {
    it('should be an object', function() {
      let returnValue = feedfinder.__returnFeedInfo(feedInfoInputData)
          assert.equal(typeof returnValue, 'object')
    })
    it('should contain args.url, args.feed and args.title', function() {
      let args = feedfinder.__returnFeedInfo(feedInfoInputData)
      let argsArray = [ args.url, args.feed, args.title ]
      argsArray.every( arg => assert.ok(arg) )
    })
    it('should contain values that are all strings', function() {
      let args = feedfinder.__returnFeedInfo(feedInfoInputData)
      function isString(x) {
        return typeof x === 'string'
      }
      return Object.values(args).every(isString)
    })
  })
  describe('the url return value', function() {
    it('should have the protocol added if it was a relative link', function() {
      let args = feedfinder.__returnFeedInfo(feedInfoInputWithRelative)
        return args.feed === 'http://www.example.com/rss'
    })
    it('should be a full URL including protocol e.g. http://example.com/feed', function() {
      let args = feedfinder.__returnFeedInfo(feedInfoInputData)
      let isUrl = /(http)s?:\/\/[a-z-A-Z0-9\.\-\_\/\?\&\+\=]*/.exec(args.url)
      return assert.ok(isUrl)
    })
  })
})

// getFeed 
describe('getFeed', function() {
  it('should reject if url is not a url', function() {
      return assert.rejects(feedfinder.getFeed(isNotUrl))
    })
  it('should reject if url 404s', function() {
    return assert.rejects(feedfinder.getFeed(cannotBeReached))
  })
  it('should reject if url is a feed', function() {
    return assert.rejects(feedfinder.getFeed(rssFeed))
  })
  it('should resolve if url contains a <link> element pointing to an RSS feed', function() {
    return assert.doesNotReject(feedfinder.getFeed(rss))
  })
  it('should resolve if url contains a <link> element pointing to an Atom feed', function() {
    return assert.doesNotReject(feedfinder.getFeed(atom))
  })
  it('should resolve if no link in head but body contains an <a> element linking to a feed.xml', function() {
    return assert.doesNotReject(feedfinder.getFeed(pageWithAnchorToRSS))
  })
  it('should resolve if no link in head but body contains an <a> element linking to an atom.xml', function() {
    return assert.doesNotReject(feedfinder.getFeed(pageWithAnchorToAtom))
  })
  it('should reject if no link in head but body contains an <a> element linking to a non-feed (based on file name) xml file', function() {
    return assert.rejects(feedfinder.getFeed(pageWithAnchorToRandom))
  })
  it('should resolve if url is a YouTube channel', function() {
    this.timeout(0)
    return assert.doesNotReject(feedfinder.getFeed(youTubeChannel))
  } )
  it('should resolve if url is a YouTube user page', function() {
    this.timeout(0)
    return assert.doesNotReject(feedfinder.getFeed(youTubeUser))
  })
  it('should resolve if url is a YouTube playlist', function() {
    this.timeout(0)
    return assert.doesNotReject(feedfinder.getFeed(youTubePlaylist))
  })
  describe('the return value', function() {
    it('should be an object', function() {
      let returnValue = assert.doesNotReject(feedfinder.getFeed(rss)) ? feedfinder.getFeed(rss) : false
      return assert.equal(typeof returnValue, 'object')
    })
    it('should contain args.url, args.feed and args.title', function() {
      feedfinder.getFeed(rss).then( function(args) {
        let argsArray = [ args.url, args.feed, args.title ]
        return argsArray.every( arg => assert.ok(arg) )
      })
    })
  })
})

// getSite 
describe('getSite', function() {
  it('should reject if feed is not a url', function() {
    return assert.rejects(feedfinder.getSite(isNotUrl))
  })
  it('should reject if url 404s', function() {
    return assert.rejects(feedfinder.getSite(cannotBeReached))
  })
  it('should reject if url is not a feed', function() {
    return assert.rejects(feedfinder.getSite(rss))
  })
  it('should resolve if url is a valid RSS feed', function() {
    return assert.doesNotReject(feedfinder.getSite(rssFeed))
  })
  it('should resolve if url is a valid Atom feed', function() {
    return assert.doesNotReject(feedfinder.getSite(atomFeed))
  })
  describe('the return value', function() {
    it('should be an object', function() {
      let returnValue = feedfinder.getSite(rssFeed)
      return assert.equal(typeof returnValue, 'object')
    })
    it('should contain args.url, args.feed and args.title', function() {
      feedfinder.getSite(rssFeed).then( function(args) {
        let argsArray = [ args.url, args.feed, args.title ]
        return argsArray.every( arg => assert.ok(arg) )
      })
    })
  })
})