const { Observable } = Rx;

// DOM
let $textbox;
let $results;
let $showBtn;

// streams
let hideStream;
let keypressStream;
let textStream;
let resultsStream;

// init
Observable.
  fromEvent(window, 'load').
  take(1).
  forEach(() => {
    const $textbox = $('#textbox');
    const $results = $('#results');
    const $showBtn = $('#show');
    const $searchForm = $('#form');

    Observable.
      fromEvent($showBtn, 'click').
      forEach(() => {
        $showBtn.hide();
        $searchForm.show();

        const resultsStream = Observable.
          fromEvent($textbox, 'keypress').
          // map(e => e.preventDefault()).
          throttle(200).
          map(() => $textbox.val().trim()).
          distinctUntilChanged().
          map((text) => getWikipediaSearchResults(text).
            retry(3)).
          switchLatest();

        resultsStream.forEach(results => displayResults($searchForm, $results, results));  
      });
  });

function getWikipediaSearchResults(term) {
  return Observable.create(function forEach(observer) {
      let isRunning = true;

      const encodedTerm = encodeURIComponent(term);
      const url = `http://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=${encodedTerm}&callback=?`;
      $.getJSON(url, data => {
        if (isRunning) {
          observer.onNext(data);
          observer.onCompleted();
        }
      });

      return function dispose() {
        isRunning = false;
      };
  });
}

function displayResults($searchForm, $results, results) {
  $results.empty();
  $searchForm.find('#no-results').remove();
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
    $searchForm.append(
      `<div id="no-results" class="text-info" role="alert">
        No results.
      </div>`
    );
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