const axios = require('axios') // for requesting web resources
const cheerio = require('cheerio') // jQuery for node
const feedparser = require('feedparser-promised') // for ...parsing feeds

const returnFeedInfo = function(args) {
  // extract the base domain URL using a regex
  var baseURL = /(.+(\/+){2})+(\w|\d|\.|-)*/.exec(args.url)[0];
  // if the feed address is relative we need to add it to the base domain URL
  var feed = /^http/.test(args.feed) ? args.feed : `${baseURL}${args.feed}`;
  args.feed = feed; // update feed address
  return args
}

const getFeed = function(url) {
  return new Promise( (resolve, reject) => {
    axios(url).then(function(res) {
      const $ = cheerio.load(res.data)
      const title = $('head title').text() // get the title from the head <title> element
      // get the RSS or Atom feed element
      const rss = $('link[type="application/rss+xml"]').clone()
      const atom = $('link[type="application/atom+xml"]').clone() || $('link[type="application/x.atom+xml"]').clone() || $('link[type="application/x-atom+xml"]').clone()
      const elem = rss.length ? rss : atom // If rss has any content (i.e. it actually exists), assign its value to elem, otherwise assign the value of atom
      if (!elem[0] || !elem) { // elem may be null or not have any child nodes if there is no feed listed in the head

        // YouTube channels don't list the feed anywhere, but we can construct a feed URL because they are always the same structure
        const rx = /(.+(\/+){2})+((\w|\d|\.|-)*)((\/(.*)(\/|\?list\=))|(\/(playlist)\?list=))?([a-zA-Z0-9-]*)/
        
        if (rx.exec(url)[3].toLocaleLowerCase() === "www.youtube.com") {
          const type = rx.exec(url)[7].toLocaleLowerCase()
          if (type === "user") {
            // build feed URL for users
            let feed = `https://www.youtube.com/feeds/videos.xml?user=${rx.exec(res.config.url)[11]}`
            let args = returnFeedInfo({url: url, feed: feed, title: title})
            resolve(args)
          }
          if (type === "channel") {
            // build feed URL for channels
            let feed = `https://www.youtube.com/feeds/videos.xml?channel_id=${rx.exec(res.config.url)[11]}`
            let args = returnFeedInfo({url: url, feed: feed, title: title})
            resolve(args)
          }
          if (type === "playlist") {
            // build feed URL for playlists
            let feed = `https://www.youtube.com/feeds/videos.xml?playlist_id=${rx.exec(res.config.url)[11]}`
            let args = returnFeedInfo({url: url, feed: feed, title: title})
            resolve(args)
          }
        } else {
          // sometimes there *is* a feed but it's not listed in the head.
          // in this case look for any link element that might be a link to the feed
          // NOTE: this will just grab the FIRST feed link listed - if it is e.g. a directory of feeds, this may not be what you want
          $('a').each(function(i, e) {
            const anchor = $(this)[0].attribs.href // look for <a> elements
            if (anchor) {
              const regexString = RegExp('(' + url + '|^(?!http)).*\/?(feed\/?|rss\/?|rss2\/?|atom\/?|(rss|atom|rss2|feed)+.xml?)$')
              var regex = RegExp(regexString, 'ig')
              const isFeed = $(this)[0].attribs.href.match(regex) // if the last section of the URL ends in atom, rss, rss2, feed or any of those + '.xml', it's the feed
              if (isFeed) {
                let feed = $(this)[0].attribs.href
                let args = returnFeedInfo({url: url, feed: feed, title: title})
                resolve(args)
              } 
            }
          })
          // if it's not a YouTube channel and there wasn't any feed link anywhere, there's no other way to automatically find the feed
          reject("No link to RSS or Atom feed found at this URL")
        }
      } else {
        // if there was an rss or atom link in the <head>, we just use that!
        let feed = elem[0].attribs.href // get the feed and title from the rss link element
        let args = returnFeedInfo({url: url, feed: feed, title: title})
        resolve(args)
      }
    })
    .catch(e => {
      // this is most likely an axios error, probably a 404 or 'ENOTFOUND'
      let error = e.message === "Request failed with status code 404" ? "Site or page does not exist" 
      : e.message.includes("ENOTFOUND") ? "URL cannot be found"
      : e.message
      reject(error)
    })
	})
}

const getSite = function(uri) {
  return new Promise( (resolve, reject) => {

    const httpOptions = {
      uri: uri,
      timeout: 10000
    }

    function feedValid(items) {
      if (items[0]) {
        resolve({url: items[0].meta.link, feed: uri, title: items[0].meta.title})
      } else {
        reject('no feed data for ' + uri)
      }
    }

    function feedInvalid(e) {
      // if the error code is "ENOTFOUND" provide a nicer message, else just show the error message
      // note that if feedparser just can't parse it, it will return a message of "Not a feed"
      const reason = e.message.includes("ENOTFOUND") ? "URL cannot be found" : e.message === "Not a feed" ? "No RSS or Atom file found at this URL" : e.message
      reject(reason)
    }

    feedparser.parse(httpOptions).then(feedValid, feedInvalid)

  })
}

/* =====================================================

Examples of how you would call feed-finder

## To get the feed URL from a site URL

getFeed("https://www.hughrundle.net")
  .then( x => {
    console.log(x)
    // returns an object
  })
  .catch( e => {
    console.error(e)
    // return a string
  })
  
  ## To get a site URL from a feed URL

  getSite("https://www.hughrundle.net/rss")
    .then( x => {
      console.log(x)
      // returns an object
    })
    .catch( e => {
      console.error(e)
      // returns a string
    })

 ===================================================== */

module.exports = {
  getFeed: getFeed,
  getSite: getSite,
  __returnFeedInfo : returnFeedInfo
}
