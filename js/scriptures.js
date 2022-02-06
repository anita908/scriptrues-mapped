const Scriptures = (function () {
  "use strict";


  const BOTTOM_PADDING = "<br /><br />";
  const CLASS_BOOKS = "books";
  const CLASS_CHAPTER = "chapter";
  const CLASS_BUTTON = "btn";
  const CLASS_VOLUME = "volumes";
  const DIV_SCRIPTURES_NAVIGATOR = "scripnav";
  const DIV_SCRIPTURES = "scriptures";
  const REQUEST_GET = "GET";
  const REQUEST_STATUS_OK = 200;
  const REQUEST_STATUS_ERROR = 400;
  const TAG_HEADERS = "h5"
  const URL_BASE = "http://scriptures.byu.edu/";
  const URL_BOOKS = `${URL_BASE}mapscrip/model/books.php`;
  const URL_VOLUMES = `${URL_BASE}mapscrip/model/volumes.php`;
  const URL_SCRIPTURES = `${URL_BASE}mapscrip/mapgetscrip.php`;
  const LAT_LON_PARSE =  /\((.*),'(.*)',(.*),(.*),(.*),(.*),(.*),(.*),(.*),(.*),'(.*)'\)/;
  const INDEX_PLACENAME = 2
  const INDEX_FLAG = 11
  const INDEX_LATITUDE = 3
  const INDEX_LONGITUDE = 4
  const SINGLE_MARKER_ZOOM = 10
  let books;
  let volumes;
  let gmMarkers = [];

  let ajax;
  let cacheBooks;
  let htmlAnchor;
  let htmlDiv;
  let htmlElement;
  let htmlLink;
  let init;
  let onHashChanged;
  let navigateHome;
  let navigateBook;
  let navigateChapter;
  let bookChapterValid;
  let volumeGridContent;
  let booksGrid;
  let booksGridContent;
  let chapterGrid;
  let chapterGridContent;
  let encodedScripturesUrlParameters;
  let getScripturesCallback;
  let getScripturesFailure;
  let nextChapter;
  let previousChapter;
  let titleForBookChapter;
  let testGeoplaces;
  let addMarker;
  let clearMarkers;
  let setupMarkers;
  let showLocation;
  let focusMarker;
  let zoomOnMarker;
  let pinFitsScreen;
  let prebackNavigator;
  let hash;

  const getData = function (url, successCallback, failureCallback, skipJsonParse) {
    fetch(url).then(function (response) {
      if(response.ok) {
        if(skipJsonParse) {
          return response.text();
        } else {
          return response.json();
        }
      }

      throw new Error("Network response was not okay.")
    }).then(function (data) {
      if (typeof successCallback === "function") {
        successCallback(data);
      } else {
        throw new Error("Callback is not a valid function.")
      }
    }).catch(function (error) {
      console.log("Error:", error.message);

      if (typeof failureCallback === "function") {
        failureCallback(error);
      }
    })
  }

  const getJson = function (url) {
    return fetch(url).then(function (response) {
      if(response.ok) {
        return response.json();
      }

      throw new Error("Network response was not okay.")
    })
  }

  ajax = function (url, successCallback, failureCallback, skipJsonParse, bookId, chapter) {
    let request = new XMLHttpRequest();
    request.open(REQUEST_GET, url, true);

    request.onload = function() {
      if (request.status >= REQUEST_STATUS_OK && request.status < REQUEST_STATUS_ERROR) {
        let data = skipJsonParse ? request.response : JSON.parse(request.response);

        if (typeof successCallback === "function") {
          successCallback(data, bookId, chapter);
        }
      } else {
        if (typeof failureCallback === "function") {
          failureCallback(request);
        }
      }
    };

    request.onerror = failureCallback;

    request.send();
  };

  init = function (callback) {
    Promise.all([getJson(URL_BOOKS), getJson(URL_VOLUMES)]).then(jsonResults => {
      let [ booksResults, volumesResults ] = jsonResults;

      books = booksResults;
      volumes = volumesResults;
      cacheBooks(callback);
    }).catch(error => {
      console.log("Unable to get volumes/books data:", error.message);
    });
    // let bookLoaded = false;
    // let volumesLoaded = false;
    // getData(URL_BOOKS,
    //   data => {
    //     books = data;
    //     bookLoaded = true;

    //     if(volumesLoaded) {
    //       cacheBooks(callback)
    //     }
    //   }
    // );
    // getData(URL_VOLUMES,
    //   data => {
    //     volumes = data;
    //     volumesLoaded = true;

    //     if(bookLoaded) {
    //       cacheBooks(callback)
    //     }
    //   }
    // );
  };

  htmlAnchor = function (volume) {
    return `<a name="v${volume.id}" />`;
  }
  
  htmlDiv = function (parameters) {
    let classString = "";
    let contentString = "";
    let idString = "";
  
    if(parameters.classKey !== undefined) {
      classString = ` class="${parameters.classKey}"`;
    }
  
    if(parameters.content !== undefined) {
      contentString = parameters.content;
    }
  
    if(parameters.id !== undefined) {
      idString = ` id="${parameters.id}"`;
    }
  
    return `<div${idString}${classString}>${contentString}</div>`;
  }
  
  htmlElement = function (tagName, content) {
    return `<${tagName}>${content}</${tagName}>`;
  }
  
  htmlLink = function (parameters) {
    let classString = "";
    let contentString = "";
    let hrefString = "";
    let idString = "";
  
    if (parameters.classKey !== undefined) {
      classString = ` class="${parameters.classKey}"`;
    }
  
    if(parameters,content !== undefined) {
      contentString = parameters.content;
    }
  
    if(parameters.href !== undefined) {
      hrefString = ` href="${parameters.href}"`;
    }
  
    if(parameters.id !== undefined) {
      idString = ` id="${parameters.id}"`;
    }
  
    return  `<a${idString}${classString}${hrefString}>${contentString}</a>`
  }

  cacheBooks = function (callback) {
    volumes.forEach(volume => {
      let volumeBooks = [];
      let bookId = volume.minBookId;

      while (bookId <= volume.maxBookId) {
        volumeBooks.push(books[bookId]);
        bookId += 1;
      }
      volume.books = volumeBooks;
    });

    if (typeof callback === "function") {
      callback();
    }
  }

  navigateBook = function (bookId) {
    let book = books[bookId];

    if(book.numChapters <= 1) {
      navigateChapter(bookId, book.numChapters);
    } else {
      document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
        id: DIV_SCRIPTURES_NAVIGATOR,
        content: chapterGrid(book),
      })
    }
  }

  navigateChapter = function (bookId, chapter) {
    ajax(encodedScripturesUrlParameters(bookId, chapter), getScripturesCallback, getScripturesFailure, true, bookId, chapter);
  }
 
  navigateHome = function (volumeId) {
    document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
      id: DIV_SCRIPTURES_NAVIGATOR,
      content: volumeGridContent(volumeId)
    });
  }

  bookChapterValid = function (bookId, chapter) {
    let book = books[bookId];

    if(book === undefined || chapter < 0 || chapter > book.numChapters) {
      return false;
    }
    if(chapter == 0 && book.numChapters > 0) {
      return false;
    }

    return true;
  }

  onHashChanged = function () {
    let ids = [];

    if(location.hash !== "" && location.hash.length > 1) {
      ids = location.hash.slice(1).split(":");
    }

    if(ids.length <= 0) {
      navigateHome();
    } else if(ids.length === 1) {
      let volumeId = Number(ids[0]);

      if(volumeId < volumes[0].id || volumeId > volumes.slice(-1)[0].id) {
        navigateHome();
      } else {
        navigateHome(volumeId);
      }
    } else {
      let bookId = Number(ids[1]);

      if(books[bookId] === undefined) {
        navigateHome();
      } else {
        if(ids.length === 2) {
          navigateBook(bookId);
        } else {
          let chapter = Number(ids[2]);

          if(bookChapterValid(bookId, chapter)) {
            navigateChapter(bookId,chapter);
          } else {
            navigateHome();
          }
        }
      }
    }
  }

  volumeGridContent = function (volumeId) {
    let gridContent = "";

    volumes.forEach(function (volume) {
      if(volumeId == undefined || volume == volume.id) {
        gridContent += htmlDiv({
          classKey: CLASS_VOLUME,
          content: htmlAnchor(volume) + htmlElement(TAG_HEADERS, volume.fullName),
        });

        gridContent += booksGrid(volume);
      }
    });

    return gridContent + BOTTOM_PADDING;
  }

  booksGrid = function (volume) {
    return htmlDiv({
      classKey: CLASS_BOOKS,
      content: booksGridContent(volume)
    });
  }

  booksGridContent = function (volume) {
    let gridContent = "";

    volume.books.forEach(function (book) {
      gridContent += htmlLink({
        classKey: CLASS_BUTTON,
        id: book.id,
        href: `#${volume.id}:${book.id}`,
        content: book.gridName,
      });
    });

    return gridContent;
  }

  chapterGrid = function (book) {
    return htmlDiv({
      classKey: CLASS_VOLUME,
      content: htmlElement(TAG_HEADERS, book.fullName),
    }) + htmlDiv({
      classKey: CLASS_BOOKS,
      content: chapterGridContent(book),
    });
  }

  chapterGridContent = function (book) {
    let gridContent = "";
    let chapter = 1;

    while(chapter <= book.numChapters) {
      gridContent += htmlLink({
        classKey: `${CLASS_BUTTON} ${CLASS_CHAPTER}`,
        id: chapter,
        href: `#0:${book.id}:${chapter}`,
        content: chapter,
      })
      chapter += 1;
    }

    return gridContent;
  }

  encodedScripturesUrlParameters = function (bookId, chapter, verses, isJst) {
    if(bookId !== undefined && chapter !== undefined) {
      let options = "";

      if(verses !== undefined) {
        options += verses;
      }

      if(isJst !== undefined) {
        options += "&jst=JST";
      }

      return `${URL_SCRIPTURES}?book=${bookId}&chap=${chapter}&verses${options}`
    }
  }

  getScripturesCallback = function (chapterHtml, bookId, chapter) {
    document.getElementById(DIV_SCRIPTURES).innerHTML = chapterHtml;
    prebackNavigator(bookId, chapter);
    setupMarkers();
  }

  getScripturesFailure = function () {
    document.getElementById(DIV_SCRIPTURES).innerHTML = "Unable to retrieve chapter contents";
  }

  titleForBookChapter = function (book, chapter) {
    if(book !== undefined) {
      if(chapter > 0) {
        return `${book.tocName} ${chapter}`;
      }

      return book.tocName;
    }
  }

  nextChapter = function (bookId, chapter) {
    let book = books[bookId];

    if(book !== undefined) {
      if(chapter < book.numChapters) {
        return  [
          bookId,
          chapter + 1,
          titleForBookChapter(book, chapter + 1)
        ]
      }
      let nextBook = books[bookId + 1];

      if (nextBook !== undefined) {
        let nextChapterValue = 0;

        if(nextBook.numChapters > 0) {
          nextChapterValue = 1;
        }

        return [
          nextBook.id,
          nextChapterValue,
          titleForBookChapter(nextBook, nextChapterValue)
        ]
      }
    }
  }

  previousChapter = function (bookId, chapter) {
    let book = books[bookId];

    if (book !== undefined) {
      if (chapter > 1) {
        return [
          bookId, 
          chapter - 1, 
          titleForBookChapter(book, chapter - 1)
        ];
      }

      let previousBook = books[bookId - 1];

      if (previousBook !== undefined) {
        let previousChapterValue = 0;

        if (previousBook.numChapters > 0) {
          previousChapterValue = previousBook.numChapters;
        }

        return [
          previousBook.id, 
          previousChapterValue, 
          titleForBookChapter(previousBook, previousChapterValue)
        ];
      }
    }
  }

  testGeoplaces = function () {
    const similar = function (number1, number2) {
      return Math.abs(number1 - number2) < 0.0000001;
    }

    const matchingElement = function (array, object) {
      let match = null;

      array.forEach(element => {
        if(similar(element.latitude, object.latitude) && similar(element.longitude, object.longitude)) {
          if(match === null) {
            match = element;
          }
        }
      })

      return match;
    }

    const makeUniqueGeoPlaces = function (geoPlaces) {
      const uniqueGeoPlaces = [];

      geoPlaces.forEach(geoPlace => {
        const matchedElement = matchingElement(uniqueGeoPlaces, geoPlace);

        if(!matchedElement) {
          uniqueGeoPlaces.push(geoPlace);
        } else {
          if (!matchedElement.name.toLowerCase().includes(geoPlace.name.toLowerCase())) {
            matchedElement.name = `${matchedElement.name}, ${geoPlace.name}`;
          }
        }
      })

      return uniqueGeoPlaces;
    }

    makeUniqueGeoPlaces(gmMarkers);
  }

  addMarker = function (placename, latitude, longitude) {
    const similar = function (number1, number2) {
      return Math.abs(number1 - number2) < 0.0000001;
    }

    let checkMarker = false;

    gmMarkers.forEach(function (marker) {
        if (marker.position.lat === Number(latitude) && marker.position.lng === Number(longitude)) {
          checkMarker = true;
        }
    });

    if (!checkMarker) {
      let marker = new google.maps.Marker({
        position: {lat: Number(latitude), lng: Number(longitude)},
        map,
        title: placename,
        animation: google.maps.Animation.DROP,
        label: {
          text: placename
        },
      })
      gmMarkers.push(marker);
    }
  }

  
  clearMarkers = function () {
    gmMarkers.forEach(function (marker) {
      marker.setMap(null);
    })

    gmMarkers = [];
  }

  setupMarkers = function () {
    if(gmMarkers.length > 0) {
      clearMarkers();
    }

    document.querySelectorAll("a[onclick^=\"showLocation(\"]").forEach(function (element) {
      let matches = LAT_LON_PARSE.exec(element.getAttribute("onclick"));

      if(matches) {
        let placename = matches[INDEX_PLACENAME];
        let latitude = matches[INDEX_LATITUDE];
        let longitude = matches[INDEX_LONGITUDE];
        let flag = matches[INDEX_FLAG];

        if(flag !== "") {
          placename = `${placename} ${flag}`;
        }

        addMarker(placename, latitude, longitude)
      }
    })

    if (gmMarkers.length === 1) {
      focusMarker(latitude, longitude)
    }

    pinFitsScreen()
  }

  pinFitsScreen = function () {
    if (gmMarkers.length === 0) {
      map.setZoom(8);
      map.panTo({lat: 31.777444, lng: 35.234935});
  }

  if(gmMarkers.length === 1) {
      map.setZoom(8);
      map.panTo(gmMarkers[0].position);
  }

  if (gmMarkers.length > 1) {
      let bounds = new google.maps.LatLngBounds();
      gmMarkers.forEach((marker) => {
          bounds.extend(marker.getPosition());
      });

      map.fitBounds(bounds);

      // Code Reference: https://stackoverflow.com/questions/19304574/center-set-zoom-of-map-to-cover-all-visible-markers
  }
  }

  showLocation = function(geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading) {
    clearMarkers();
    addMarker(placename, latitude, longitude);
    focusMarker(latitude, longitude);
    zoomOnMarker(SINGLE_MARKER_ZOOM);
  }

  focusMarker = function (latitude, longitude) {
    map.panTo({lat: Number(latitude), lng: Number(longitude)});
  }

  zoomOnMarker = function (zoomValue) {
    map.setZoom(zoomValue);
  }

  hash = function (volumeId, bookId, chapter) {
    let hashValue = "#";

    if (volumeId !== undefined) {
        hashValue += volumeId;

        if (bookId !== undefined) {
            hashValue += `:${bookId}`;

            if (chapter !== undefined) {
                hashValue += `:${chapter}`;
            }
        }
    }
    location.hash = hashValue;

    // Reference: https://github.com/brandenclark/JS-Scriptures-Mapped/blob/master/js/scriptures.js
  }

  prebackNavigator = function (bookId, chapter) {
    let navButton = "";
    let previousChapterInfo = previousChapter(bookId, chapter);
    let nextChapterInfo = nextChapter(bookId, chapter);
    let previousBook;
    let nextBook;

    if (previousChapterInfo) {
      previousBook = books[previousChapterInfo[0]];
    }
    if (nextChapterInfo) {
      nextBook = books[nextChapterInfo[0]];
    }

    if (previousBook) {
      navButton += `<a onclick="Scriptures.hash(${previousBook.parentBookId}, ${previousChapterInfo[0]}, ${previousChapterInfo[1]})"><i class="pre-next">previous</i></a>`;
    }

    if (nextBook) {
      navButton += `<a onclick="Scriptures.hash(${nextBook.parentBookId}, ${nextChapterInfo[0]}, ${nextChapterInfo[1]})"> <i class="pre-next">next</i></a>`;
    }

    if (navButton) {
      document.querySelector(`div[class^=\"navheading\"]`).innerHTML += "<div class=\"navButton\">" + navButton + "</div>";
    }
  }

  return {
    init,
    onHashChanged,
    showLocation,
    hash,
  }
}()) ;