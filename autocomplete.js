const { Observable } = Rx;

// DOM
let $textbox;
let $results;
let $openBtn;
let $searchForm;

Observable.
  fromEvent(window, 'load').
  take(1).
  forEach(init);

function init() {

  // init DOM
  $textbox = $('#textbox');
  $results = $('#results');
  $openBtn = $('#open');
  $closeBtn = $('#close');
  $searchForm = $('#form');

  // init functions that return observables
  
  const openBtnHideAnimated = 
    singleRunObservableFactory(function openBtnHide() {
      return $openBtn.hide(250);
    });
  const searchFormShowAnimated = 
    singleRunObservableFactory(function searchFormShow() {
      return $searchForm.show(250);
    });

  const openBtnShowAnimated = 
    singleRunObservableFactory(function openBtnHide() {
      return $openBtn.show(250);
    });
  const searchFormHideAnimated = 
    singleRunObservableFactory(function searchFormShow() {
      return $searchForm.hide(250);
    });

  const getWikipediaSearchResults = 
    singleRunObservableFactory(function getWikiResults(term) {
      const encodedTerm = encodeURIComponent(term);
      const url = `http://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=${encodedTerm}&callback=?`;
      return $.getJSON(url);
    });

  // init streams
  const openClicks = Observable.fromEvent($openBtn, 'click');
  const closeClicks = Observable.fromEvent($closeBtn, 'click');
  const textboxKeyPresses = Observable.fromEvent($textbox, 'keypress');

  const searchBoxClosing = closeClicks.
    concatMap(() => 
      searchFormHideAnimated().
        concatMap(() => 
          openBtnShowAnimated().
            map(() => clearResultsList()).
            map(() => $textbox.val(''))
        )
    );

  const searchBoxOpenning = openClicks.
    concatMap(() => openBtnHideAnimated().
      concatMap(() => searchFormShowAnimated().
        map(() => $textbox.focus()))
    );

  const searchBoxOpened = textboxKeyPresses.
    throttle(200).
    map(() => $textbox.val().trim()).
    distinctUntilChanged().
    map((text) => 
      getWikipediaSearchResults(text).
      retry(3)).
    switchLatest().
    takeUntil(searchBoxClosing);

  const resultsStream = searchBoxOpenning.
    map(() => searchBoxOpened).
    switchLatest();

  resultsStream.forEach(displayResults);
}

function singleRunObservableFactory(functionWithDone) {
  return function createObservable(...args) {
    return Observable.create(function forEach(observer) {
      let isRunning = true;

      functionWithDone(...args).
        promise().
        done((...doneArgs) => {
          if (isRunning) {
            observer.onNext(...doneArgs);
            observer.onCompleted();
          }
        });

      return function dispose() {
        isRunning = false;
      }
    });
  }
}

function clearResultsList() {
  $results.empty();  
  $searchForm.find('#no-results').remove();
}

function showNoResults() {
  $searchForm.append(
    `<div id="no-results" class="text-info" role="alert">
      No results.
    </div>`
  );
}

function displayResults(results) {
  clearResultsList();
  if (Array.isArray(results)) {
    const [, terms, descriptions, links ] = results;
    zip(terms, descriptions, links, (term, desc, link) => {
      $results.append(
        `<li class="list-group-item">
          <h5 class="list-group-item-heading">
            <a href="${link}" target="_blank">${term}</a>
          </h5>
          <p class="list-group-item-text">
            ${desc}
          </p>
        </li>`);
    });
  } else {
    showNoResults();
  }
}

function zip(...args) {
  if (args.length < 3) throw 'Must pass at least 3 arguments';
  const cb = args[args.length - 1];
  const arrays = args.slice(0, -1);
  const len = Math.
    min(arrays.
      reduce((min, arr) => 
        Math.min(min, arr.length), Number.MAX_VALUE));
  let counter = 0;
  while (counter < len) {
    const items = arrays.
      reduce((items, arr) => items.concat([arr[counter]]), []);
    cb(...items);
    counter += 1;
  }
}