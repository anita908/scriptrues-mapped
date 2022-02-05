const Scriptures = (function () {
  "use strict";


  const BOTTOM_PADDING = "<br /><br />";
  const CLASS_BOOKS = "books";
  const CLASS_BUTTON = "btn";
  const CLASS_VOLUME = "volumes";
  const DIV_SCRIPTURES_NAVIGATOR = "scripnav";
  const DIV_SCRIPTURES = "scriptures";
  const REQUEST_GET = "GET";
  const REQUEST_STATUS_OK = 200;
  const REQUEST_STATUS_ERROR = 400;
  const TAG_HEADERS = "h5"
  const URL_BASE = "http://scriptures.byu.edu";
  const URL_BOOKS = `${URL_BASE}mapscrip/model/books.php`;
  const  URL_VOLUMES = `${URL_BASE}mapscrip/model/volumes.php`;

  let books;
  let volumes;

  let ajax;
  let cacheBooks;
  let htmlAnchor;
  let htmlDiv;
  let htmlElement;
  let htmlLink;
  let htmlHashLink;
  let init;
  let onHashChanged;
  let navigateHome;
  let navigateBook;
  let navigateChapter;
  let bookChapterValid;
  let volumeGridContent;
  let booksGrid;
  let booksGridContent;

  ajax = function (url, successCallback, failureCallback) {
    let request = new XMLHttpRequest();
    request.open(REQUEST_GET, url, true);

    request.onload = function() {
      if (this.status >= REQUEST_STATUS_OK && this.status < REQUEST_STATUS_ERROR) {
        // Success!
        let data = JSON.parse(this.response);

        if (typeof successCallback === "function") {
          successCallback(data)
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
    let bookLoaded = false;
    let volumesLoaded = false;
    ajax("https://scriptures.byu.edu/mapscrip/model/books.php",
      data => {
        books = data;
        bookLoaded = true;

        if(volumesLoaded) {
          cacheBooks(callback)
        }
      }
    );
    ajax("https://scriptures.byu.edu/mapscrip/model/volumes.php",
      data => {
        volumes = data;
        volumesLoaded = true;

        if(bookLoaded) {
          cacheBooks(callback)
        }
      }
    );
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
  
  htmlHashLink = function (hashArguments, content) {
    return `<a href="javascript.void(0)" onclick="changeHash(${hashArguments})">${content}</a>`;
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
    console.log(`navigate book ${bookId}`);
  }

  navigateChapter = function (bookId, chapter) {
    console.log(`navigate chapter ${bookId}, ${chapter}`);
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

    return gridContent;
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

  return {
    init,
    onHashChanged,
  }
}()) ;