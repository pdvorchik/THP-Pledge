var fullData$ = new Rx.BehaviorSubject();
var filteredData$ = new Rx.BehaviorSubject();
var selectedDistricts$ = new Rx.BehaviorSubject();

// Setup state selector
$( document ).ready(()=> {
  var selectedState$ = Rx.Observable.fromEvent($('#select--state'), 'change');
  selectedState$.subscribe(function(res) {
    let key = res.currentTarget.value;
    if (key) {
      filteredData$.next({[key]: (key in fullData$.getValue() ? fullData$.getValue()[key] : {})});
    } else {
      filteredData$.next(fullData$.getValue());
    }
  });
});

// Seed initial data
firebasedb.ref('town_hall_pledges/').once('value').then(function(snapshot) {
  const res = groupByStateAndDistrict(snapshot.val());
  filteredData$.next(res);
  fullData$.next(res);
  initStateSelector($('#select--state'), res);
});

// Helper functions
function groupByStateAndDistrict(data) {
  return Object.keys(data).reduce((obj, stateAbrv) => {
    obj[stateAbrv] = Object.keys(data[stateAbrv]).reduce(function(districts, key) {
      const val = data[stateAbrv][key].district || data[stateAbrv][key].role;

      districts[val] = districts[val] || [];
      districts[val].push(data[stateAbrv][key]);
      return districts;
    }, {});

    return obj;
  }, {});
}

function getDistrictKey(record) {
  return record.district || record.office;
}

function initStateSelector(ele, data) {
  // TODO alphabatize results
  $( document ).ready(()=> {
    Object.keys(data).forEach(key => {
      ele.append('<option value="' + key + '">' + stateAbrvToName[key] + '</option>');
    });
  });
}

function districtLookup(district) {
  let districtParts = district.split('-');
  if (districtParts[0] in fullData$.getValue() && districtParts[1] in fullData$.getValue()[districtParts[0]]) {
    return fullData$.getValue()[districtParts[0]][districtParts[1]];
  }
  return [];
}

function takenThePledge(record) {
  return record.pledged ? ' has taken the pledge.' : ' has not taken the pledge.'
}

lookupZip = function() {
  firebasedb.ref('/zipToDistrict/' + $("#input--zipcode").val()).once('value').then(function(snapshot) {
    const val = snapshot.val();
    selectedDistricts$.next(Object.keys(val).map(key => val[key].abr + '-' + val[key].dis));
  });
};
