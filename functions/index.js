'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
// const cors = require('cors')({ origin: true });
admin.initializeApp(functions.config().firebase);

const ref = admin.database().ref();

exports.fiveminuteReset = functions.https.onRequest((req, res) => {
  // var serverDateTime = new Date(admin.database.ServerValue.TIMESTAMP);
  var d1 = new Date();
  var xdate = new Date(d1);
  var sdate = new Date(d1);
  xdate.setHours(d1.getHours() - 168); //less 24hours
  sdate.setHours(d1.getHours() + 8); //manila +8 offset from UTC

  var computedStartDateTimeNow = xdate.getFullYear() + "-" + ("0" + (xdate.getMonth() + 1)).slice(-2) + "-" + ("0" + xdate.getDate()).slice(-2)
    + "T" + ("0" + (xdate.getHours())).slice(-2) + ":" + ("0" + xdate.getMinutes()).slice(-2);

  var computedDateTimeNow = sdate.getFullYear() + "-" + ("0" + (sdate.getMonth() + 1)).slice(-2) + "-" + ("0" + sdate.getDate()).slice(-2)
    + "T" + ("0" + (sdate.getHours())).slice(-2) + ":" + ("0" + sdate.getMinutes()).slice(-2);

  ref.child('lots').orderByChild('reservationdetails/expiry').startAt(computedStartDateTimeNow).endAt(computedDateTimeNow).once('value').then(snapshot => {
    if (snapshot.exists()) {

      getStatusColors().then(statusColors => {
        if (statusColors) {

          snapshot.forEach(element => {

            if (element.val().reservationdetails.expiry) {

              getNextReservation(element.key, element.val().reservation, element.val().reservationdetails.expiry).then(tokens => {

                var map_lot = 'block' + element.val().block + 'lot' + element.val().lot;
                getMapLotStatus(map_lot, element.val().level).then(mapLotStatus => {

                  var updatePathsAtOnce = {};
                  if (tokens) {
                    var keys = Object.keys(tokens);
                    var previousDate;
                    var key = '';

                    keys.forEach(ckey => {
                      //contain next
                      //check if next reservation is also expired
                      var kxdate = new Date(tokens[ckey].expiry);
                      if (tokens[ckey].expiry) {
                        if (kxdate > sdate) {
                          if (previousDate) {
                            if (kxdate < previousDate) {
                              //if current expiry date is greater than previous evaluated expiry
                              key = ckey;
                            }
                          }
                          else {
                            key = ckey;
                          }

                          previousDate = kxdate;
                        }
                      }
                    });

                    if (key) {
                      updatePathsAtOnce['/reservations/' + element.key + '/' + element.val().reservation + '/iscurrent'] = false;
                      updatePathsAtOnce['/reservations/' + element.key + '/' + element.val().reservation + '/isexpired'] = true;
                      updatePathsAtOnce['/reservations/' + element.key + '/' + key + '/iscurrent'] = true;
                      updatePathsAtOnce['/reservations/' + element.key + '/' + key + '/isexpired'] = false;
                      tokens[key].iscurrent = true;
                      tokens[key].isxpired = false;
                      updatePathsAtOnce['/lots/' + element.key + '/reservation'] = key.toString();
                      updatePathsAtOnce['/lots/' + element.key + '/reservationdetails'] = tokens[key];
                      updatePathsAtOnce['/lots/' + element.key + '/status'] = tokens[key].type;
                      updatePathsAtOnce['/lots/' + element.key + '/maprenderdetails/bg_color'] = statusColors[tokens[key].type].bg_color;
                      updatePathsAtOnce['/lots/' + element.key + '/maprenderdetails/fore_color'] = statusColors[tokens[key].type].fore_color;
                      updatePathsAtOnce['/lots/' + element.key + '/maprenderdetails/status_name'] = statusColors[tokens[key].type].name;

                      //if have map_lot then update map_lot
                      if (mapLotStatus) {
                        updatePathsAtOnce['/lots/' + map_lot + '/status'] = mapLotStatus;
                        updatePathsAtOnce['/lots/' + map_lot + '/maprenderdetails/bg_color'] = statusColors[mapLotStatus].bg_color;
                        updatePathsAtOnce['/lots/' + map_lot + '/maprenderdetails/fore_color'] = statusColors[mapLotStatus].fore_color;
                        updatePathsAtOnce['/lots/' + map_lot + '/maprenderdetails/status_name'] = statusColors[mapLotStatus].name;
                      }
                    }

                  }
                  else {
                    //no next
                    updatePathsAtOnce['/reservations/' + element.key + '/' + element.val().reservation + '/iscurrent'] = false;
                    updatePathsAtOnce['/reservations/' + element.key + '/' + element.val().reservation + '/isexpired'] = true;
                    updatePathsAtOnce['/lots/' + element.key + '/reservation'] = '';
                    updatePathsAtOnce['/lots/' + element.key + '/reservationdetails'] = '';
                    updatePathsAtOnce['/lots/' + element.key + '/status'] = 'available';
                    updatePathsAtOnce['/lots/' + element.key + '/maprenderdetails/bg_color'] = statusColors['available'].bg_color;
                    updatePathsAtOnce['/lots/' + element.key + '/maprenderdetails/fore_color'] = statusColors['available'].fore_color;
                    updatePathsAtOnce['/lots/' + element.key + '/maprenderdetails/status_name'] = statusColors['available'].name;

                    //if have map_lot then update map_lot
                    if (mapLotStatus) {
                      updatePathsAtOnce['/lots/' + map_lot + '/status'] = mapLotStatus;
                      updatePathsAtOnce['/lots/' + map_lot + '/maprenderdetails/bg_color'] = statusColors[mapLotStatus].bg_color;
                      updatePathsAtOnce['/lots/' + map_lot + '/maprenderdetails/fore_color'] = statusColors[mapLotStatus].fore_color;
                      updatePathsAtOnce['/lots/' + map_lot + '/maprenderdetails/status_name'] = statusColors[mapLotStatus].name;
                    }

                  }

                  ref.update(updatePathsAtOnce).then(function () {
                    console.log(element.key + ": Write completed")
                  }).catch(function (error) {
                    console.log(element.key + ':' + error)
                  });

                });

              });

            }

          });

          res.status(200).send('ok:' + snapshot.numChildren());

        }
        else {
          res.status(505).send('status colors not defined');
        }

      }).catch(reason => {
        res.status(505).send('fiveminuteReset error: ' + reason);
      });
    }
    else {
      res.status(200).send('snapshot null');
    }
    // res.status(200).send('total is ' + snapshot.numChildren());
  }).catch(reason => {
    res.status(505).send('fiveminuteReset error: ' + reason);
  });
});
exports.reservationReports = functions.database.ref('/lots/{uid}')
  .onWrite(event => {
    //get previous and new data
    //get server time +8
    //get ActivityReport current value
    //compare previous date if today, if not today no update to be set, if today: update the ActivityReport Current value
    //compare current date if today, if not today no update to be set, if today: update the ActivityReport Current value

    const previousData = event.data.previous.val();
    const newData = event.data.val();

    var serverDateTime = new Date();
    var serverDateTimePH = new Date(serverDateTime);
    serverDateTimePH.setHours(serverDateTime.getHours() + 8);
    var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2) + "T00:00";
    var serverDatePH = new Date(serverDatePH_String);

    var updatePathsAtOnce = {};

    if (previousData.reservationdetails) {
      if (previousData.reservationdetails.start) {
        var previousDataStart = new Date(previousData.reservationdetails.start);
        var previousDataStart_noTimeString = previousDataStart.getFullYear() + "-" + ("0" + (previousDataStart.getMonth() + 1)).slice(-2) + "-" + ("0" + previousDataStart.getDate()).slice(-2) + "T00:00";
        var previousDataStart_noTimeDate = new Date(previousDataStart_noTimeString);
        if (serverDatePH.getTime() === previousDataStart_noTimeDate.getTime()) {
          //get ActivityReport Current Value
          var previousDataStatus = previousData.status;
          if (previousDataStatus) {
            if (previousDataStatus != 'notyetavailable' && previousDataStatus != 'available') {
              admin.database().ref('/reports/lotstatus/Today/' + previousData.type + '/' + previousDataStatus).transaction(qty => qty = qty - 1).then(() => { });
              console.log('less:ok');
            }

          }

        }
      }
    }


    if (newData.reservationdetails) {
      if (newData.reservationdetails.start) {
        var newDataStart = new Date(newData.reservationdetails.start);
        var newDataStart_noTimeString = newDataStart.getFullYear() + "-" + ("0" + (newDataStart.getMonth() + 1)).slice(-2) + "-" + ("0" + newDataStart.getDate()).slice(-2) + "T00:00";
        var newDataStart_noTimeDate = new Date(newDataStart_noTimeString);
        if (serverDatePH.getTime() === newDataStart_noTimeDate.getTime()) {
          //get ActivityReport Current Value
          var newDataStatus = newData.status;
          if (newDataStatus) {

            if (newDataStatus != 'notyetavailable' && newDataStatus != 'available') {
              admin.database().ref('/reports/lotstatus/Today/' + newData.type + '/' + newDataStatus).transaction(qty => qty = qty + 1).then(() => { });
              console.log('add:ok');
            }

          }

        }
      }
    }

    return null;

  });



exports.reservationReportsReset = functions.https.onRequest((req, res) => {
  var updatePathsAtOnce = {};
  updatePathsAtOnce['/reports/lotstatus/Today'] = {
    bonechamber: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    cinerarium: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    familylots1: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    familylots2: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    familylots3: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    familylots4: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    familylots5: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    gardenlots1: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    gardenlots2: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    gardenlots3: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    gardenlots4: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    gardenlots5: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    lawnlots: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    wallniche: {
      hold: 0,
      reserved: 0,
      sold: 0
    }
  };

  ref.update(updatePathsAtOnce).then(function () {
    res.status(200).send("Write completed");
  }).catch(function (error) {
    res.status(200).send('error');
  });


});


const getStatusColors = () => {
  return admin.database().ref('/statuscolor').once('value').then(snap => {
    return snap.val();
  });
}

const getNextReservation = (lotKey, currentReservationKey, currentServerDateTime) => {
  return admin.database().ref('/reservations/' + lotKey).orderByChild('start').startAt(currentServerDateTime).limitToFirst(2).once('value').then(snap => {
    return snap.val();
    //SHB note: will check later if the ff will matter:
    //01/01/2018 - Hold Expires
    //01/10/2018 - Reservation Starts
    //01/02 - 09,2018 - Available --- also as current date = 01/03/2018
  });
}

const getMapLotStatus = (mapLot, level) => {
  if (level) {
    return admin.database().ref('/lots').orderByKey('map_lot').equalTo(mapLot).limitToFirst(5).once('value').then(snap => {
      if (snap.exists()) {
        var winningValStat = 0;
        snap.forEach(element => {
          var valStat = 0;
          var stat = element.val().status;
          if (stat) {
            if (stat === 'available') valStat = 5;
            else if (stat === 'hold') valStat = 4;
            else if (stat === 'reserved') valStat = 3;
            else if (stat === 'soldlacking') valStat = 2;
            else if (stat === 'sold') valStat = 1;
            else valStat = 0; //notyetavailable
          }
          if (valStat > winningValStat) {
            winningValStat = valStat;
          }
        });

        if (winningValStat == 5) return Promise.resolve('available');
        else if (winningValStat == 4) return Promise.resolve('hold');
        else if (winningValStat == 3) return Promise.resolve('reserved');
        else if (winningValStat == 2) return Promise.resolve('soldlacking');
        else if (winningValStat == 1) return Promise.resolve('sold');
        else return Promise.resolve('notyetavailable');

      }
      else {
        return Promise.resolve('notyetavailable');
      }
    }).catch(function (error) {
      return Promise.resolve('notyetavailable');
    });
  }
  else {
    return Promise.resolve(null);
  }


}


exports.getDailyRunningTotal = functions.https.onRequest((req, res) => {
  // identofy type_status_invetoriable to query
  var toQuery = [
    {
      c0: 'lawnlots_hold_yes',
      c1: 'lawnlots',
      c2: 'hold'
    },
    {
      c0: 'lawnlots_sold_yes',
      c1: 'lawnlots',
      c2: 'sold'
    }

  ]

  // 'lawnlots_hold_yes',
  // 'lawnlots_reserved_yes',
  // 'lawnlots_sold_yes',
  // 'lawnlots_available_yes',
  // 'lawnlots_notyetavailable_yes',
  // 'wallniche_hold_yes',
  // 'wallniche_reserved_yes',
  // 'wallniche_sold_yes',
  // 'wallniche_available_yes',
  // 'wallniche_notyetavailable_yes',    
  // // ...  

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);

  toQuery.forEach(que => {
    // query to firebase
    ref.child('lots').orderByChild('type_status_inventoriable').equalTo(que.c0).once('value').then(snapshot => {
      if (snapshot.exists()) {
        admin.database().ref('/reports/dailyRunningTotal/' + serverDatePH_String + '/' + que.c1 + '/' + que.c2).transaction(qty => qty = snapshot.numChildren()).then(() => { });

      }
      else {
        admin.database().ref('/reports/dailyRunningTotal/' + serverDatePH_String + '/' + que.c1 + '/' + que.c2).transaction(qty => qty = 0).then(() => { });

      }

    });


  });

  res.status(200).send('ok:getDailyRunningTotal');

});


exports.dataCatchupLotTypeStatusInventoriable = functions.https.onRequest((req, res) => {
  ref.child('lots').orderByChild('type_status_inventoriable').equalTo(null).limitToFirst(100).once('value').then(snapshot => {

    if (snapshot.exists()) {

      snapshot.forEach(element => {
        // if (snapshot.val().type_status_inventoriable) {
          admin.database().ref('/lots/' + element.key + '/type_status_inventoriable').transaction(val => val = element.val().type + '_' + element.val().status + '_' + element.val().inventoriable).then(() => { });
        // }
      });

    }

    res.status(200).send('ok.dataCatchupLotTypeStatusInventoriable:' + snapshot.numChildren());

  });

});


exports.countLotInventoriable = functions.https.onRequest((req, res) => {
  ref.child('lots').orderByChild('inventoriable').equalTo('yes').once('value').then(snapshot => {
   
    res.status(200).send('ok.countLot.inventoriable:' + snapshot.numChildren());
  });

});

exports.countLotAll = functions.https.onRequest((req, res) => {
  ref.child('lots').once('value').then(snapshot => {
   
    res.status(200).send('ok.countLot.all:' + snapshot.numChildren());
  });  

});


exports.countLotAllLotTypeStatusInventoriable = functions.https.onRequest((req, res) => {
  ref.child('lots').orderByChild('type_status_inventoriable').equalTo(null).once('value').then(snapshot => {

    res.status(200).send('ok.countLotAllLotTypeStatusInventoriable:' + snapshot.numChildren());

  });

});