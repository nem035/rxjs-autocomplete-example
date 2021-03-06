const { Observable } = Rx;

// DOM
let $textbox;
let $results;
let $openBtn;
let $closeBtn;
let $searchForm;
let $header;

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
  $header = $('#header');

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

  const spinnerShowAnimated =
    singleRunObservableFactory(function spinnerShow() {
      return $('<div>').
        addClass('spinner').
        appendTo($header).
        fadeIn(200);
    });
  const spinnerHideAnimated =
    singleRunObservableFactory(function spinnerHide() {
      return $header.
        find('.spinner').
        fadeOut(200);
    });

  const getWikipediaSearchResults = 
    singleRunObservableFactory(function getWikiResults(term) {
      const encodedTerm = encodeURIComponent(term);
      return $.ajax({
          url: '//en.wikipedia.org/w/api.php',
          data: { 
            action: 'opensearch',
            search: encodedTerm,
            format: 'json'
          },
          dataType: 'jsonp'
      });
    });

  // init streams
  
  const openClicks = Observable.fromEvent($openBtn, 'click');
  const closeClicks = Observable.fromEvent($closeBtn, 'click');
  const textboxKeys = Observable.fromEvent($textbox, 'keyup');

  const searchBoxClosing = closeClicks.
    concatMap(() => 
      searchFormHideAnimated().
        concatMap(() => 
          openBtnShowAnimated().
            do(() => clearResultsList()).
            do(() => $textbox.val(''))
        )
    );

  const searchBoxOpenning = openClicks.
    concatMap(() => openBtnHideAnimated().
      concatMap(() => searchFormShowAnimated().
        do(() => $textbox.focus()).
        do(() => showNoResults()))
    );

  const searchBoxOpened = textboxKeys.
    debounce(200).
    map(() => $textbox.val().trim()).
    filter(({ length }) => length > 0).
    distinctUntilChanged().
    map((text) => 
      spinnerShowAnimated().
      map(() =>
        getWikipediaSearchResults(text).
        retry(3)).
      switchLatest().
      map((result) => 
        spinnerHideAnimated().
        do(() => $header.find('.spinner').remove()).
        map(() => result)).
      switchLatest()).
    switchLatest();

  const resultsStream = searchBoxOpenning.
    concatMap(() => searchBoxOpened.
      takeUntil(searchBoxClosing));

  resultsStream.forEach(displayResults, displayError);
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
        }).
        fail((...failArgs) => {
          if (isRunning) {
            observer.onError(...failArgs);
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
  $searchForm.
    find('#no-results').
    remove();
}

function showNoResults() {
  $('<div>').
    attr('id', 'no-results').
    addClass('no-results').
    text('No results.').
    appendTo($results);
}

function displayResults(result) {
  clearResultsList();
  if (Array.isArray(result) && 
      result.length === 4 && 
      result[1].length > 0) {

    const [, terms, descriptions, links ] = result;
    zip(terms, descriptions, links, (term, desc, link) => {
      $results.append(
        `<li class="list-item">
          <div class="list-item-head">
            <a href="${link}" target="_blank">${term}</a>
          </div>
          <div class="list-item-body">
            ${desc}
          </div>
        </li>`);
    });
  } else {
    showNoResults();
  }
}

function displayError(error) {
  clearResultsList();
  $('<div>').
    addClass('error-message').
    html(error).
    appendTo($results);
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