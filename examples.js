fromEvent = function(dom, eventName) {
  return {

    forEach(observer) {
      const handler = e => observer.onNext(e);
      dom.addEventListener(eventName, handler);

      // return subscription object
      return {
        dispose() {
          dom.removeEventListener(eventName, handler);
        }
      }
    }
  }
}

// mouse move example

const getElementDrags = elmt => {
  elmt.mouseDowns = Observable.fromEvent(elmt, 'mousedown');
  elmt.mouseUps = Observable.fromEvent(elmt, 'mouseup');
  elmt.mouseMoves = Observable.fromEvent(elmt, 'mousemove');
  return elm.mouseDowns
    .map(mouseDown => 
      elmt.mouseMoves
        .takeUntil(elmt.mouseUps)
    ).concatAll();
}

getElementDrags(image)
  .forEach(pos => image.position = pos);

// autocomplete search example

const searchResultSets =
  keyPresses
    // .throttle(250) // performance optimization
    .map(key =>
      getJSON(`/search?q=${input.value}`)
        .retry(3)
        .switchLatest());
    //     .takeUntil(keyPresses)
    // ).concatAll();

searchResultSets.forEach(
  resultSet => updateSearchResults(resultSet),
  error => showMessage('the server appears to be down')
);

// movie player example
const authorizations =
  player.init()
    .map(() => playAttempts.
      map(movieId => player.authorize(movieId)
        .catch(e => Observable.empty)
        .takeUntil(cancels)
      ).concatAll()
    ).concatAll()

authorizations.forEach(
  license => player.play(license),
  error => showDialog('Sorry, cannot play right now')
);

// setTimeout as an observer
for