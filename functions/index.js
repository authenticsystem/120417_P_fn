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
        var previousDataStart_noTimeString = previousDataStart.getFullYear() + "-" + ("0" + (previousDataStart.getMonth() + 1)).slice(-2) + "-" + ("0" + previousDataStart.getDate()).slice(-2);
        var previousDataStart_noTimeDate = new Date(previousDataStart_noTimeString);
        var previousDataStart_Month = previousDataStart.getFullYear() + "-" + ("0" + (previousDataStart.getMonth() + 1)).slice(-2);
        var previousDataStart_Year = previousDataStart.getFullYear();
        var previousDataStart_Week = getWeekNumber(previousDataStart);


        var previousDataStatus = previousData.status;
        if (previousDataStatus) {
          if (previousDataStatus != 'notyetavailable' && previousDataStatus != 'available') {
            //daily
            admin.database().ref('/reports/activity/daily/' + previousDataStart_noTimeString + '/lotType/' + previousData.type + '/' + previousDataStatus).transaction(qty => qty = qty - 1).then(() => { });
            admin.database().ref('/reports/activity/daily/' + previousDataStart_noTimeString + '/total' + jsUcfirst(previousDataStatus)).transaction(qty => qty = qty - 1).then(() => { });

            //weekly
            admin.database().ref('/reports/activity/weekly/' + previousDataStart_Week + '/lotType/' + previousData.type + '/' + previousDataStatus).transaction(qty => qty = qty - 1).then(() => { });
            admin.database().ref('/reports/activity/weekly/' + previousDataStart_Week + '/total' + jsUcfirst(previousDataStatus)).transaction(qty => qty = qty - 1).then(() => { });

            //monthly
            admin.database().ref('/reports/activity/monthly/' + previousDataStart_Month + '/lotType/' + previousData.type + '/' + previousDataStatus).transaction(qty => qty = qty - 1).then(() => { });
            admin.database().ref('/reports/activity/monthly/' + previousDataStart_Month + '/total' + jsUcfirst(previousDataStatus)).transaction(qty => qty = qty - 1).then(() => { });

            //yearly
            admin.database().ref('/reports/activity/yearly/' + previousDataStart_Year + '/lotType/' + previousData.type + '/' + previousDataStatus).transaction(qty => qty = qty - 1).then(() => { });
            admin.database().ref('/reports/activity/yearly/' + previousDataStart_Year + '/total' + jsUcfirst(previousDataStatus)).transaction(qty => qty = qty - 1).then(() => { });

            //comparative
            admin.database().ref('/reports/comparative/' + previousData.type + '/daily/' + previousDataStart_noTimeString + '/total' + jsUcfirst(previousDataStatus)).transaction(qty => qty = qty - 1).then(() => { });
            admin.database().ref('/reports/comparative/' + previousData.type + '/weekly/' + previousDataStart_Week + '/total' + jsUcfirst(previousDataStatus)).transaction(qty => qty = qty - 1).then(() => { });
            admin.database().ref('/reports/comparative/' + previousData.type + '/monthly/' + previousDataStart_Month + '/total' + jsUcfirst(previousDataStatus)).transaction(qty => qty = qty - 1).then(() => { });
            admin.database().ref('/reports/comparative/' + previousData.type + '/yearly/' + previousDataStart_Year + '/total' + jsUcfirst(previousDataStatus)).transaction(qty => qty = qty - 1).then(() => { });

            //For Update
            if (serverDatePH.getTime() !== previousDataStart_noTimeDate.getTime()) {
              admin.database().ref('/reports/forUpdate/' + previousDataStart_noTimeString + '/lotType/' + previousData.type + '/' + previousDataStatus).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/forUpdate/' + previousDataStart_noTimeString + '/total' + jsUcfirst(previousDataStatus)).transaction(qty => qty = qty - 1).then(() => { });
            }

            console.log('less:ok');
          }
        }


      }
    }


    if (newData.reservationdetails) {
      if (newData.reservationdetails.start) {
        var newDataStart = new Date(newData.reservationdetails.start);
        var newDataStart_noTimeString = newDataStart.getFullYear() + "-" + ("0" + (newDataStart.getMonth() + 1)).slice(-2) + "-" + ("0" + newDataStart.getDate()).slice(-2);
        var newDataStart_noTimeDate = new Date(newDataStart_noTimeString);
        var newDataStart_Month = newDataStart.getFullYear() + "-" + ("0" + (newDataStart.getMonth() + 1)).slice(-2);
        var newDataStart_Year = newDataStart.getFullYear();
        var newDataStart_Week = getWeekNumber(newDataStart);


        var newDataStatus = newData.status;
        if (newDataStatus) {
          if (newDataStatus != 'notyetavailable' && newDataStatus != 'available') {

            //daily
            admin.database().ref('/reports/activity/daily/' + newDataStart_noTimeString + '/lotType/' + newData.type + '/' + newDataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/daily/' + newDataStart_noTimeString + '/total' + jsUcfirst(newDataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //weekly
            admin.database().ref('/reports/activity/weekly/' + newDataStart_Week + '/lotType/' + newData.type + '/' + newDataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/weekly/' + newDataStart_Week + '/total' + jsUcfirst(newDataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //monthly
            admin.database().ref('/reports/activity/monthly/' + newDataStart_Month + '/lotType/' + newData.type + '/' + newDataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/monthly/' + newDataStart_Month + '/total' + jsUcfirst(newDataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //yearly
            admin.database().ref('/reports/activity/yearly/' + newDataStart_Year + '/lotType/' + newData.type + '/' + newDataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/yearly/' + newDataStart_Year + '/total' + jsUcfirst(newDataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //comparative
            admin.database().ref('/reports/comparative/' + newData.type + '/daily/' + newDataStart_noTimeString + '/total' + jsUcfirst(newDataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + newData.type + '/weekly/' + newDataStart_Week + '/total' + jsUcfirst(newDataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + newData.type + '/monthly/' + newDataStart_Month + '/total' + jsUcfirst(newDataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + newData.type + '/yearly/' + newDataStart_Year + '/total' + jsUcfirst(newDataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //for Update
            if (serverDatePH.getTime() !== newDataStart_noTimeDate.getTime()) {
              admin.database().ref('/reports/forUpdate/' + newDataStart_noTimeString + '/lotType/' + newData.type + '/' + newDataStatus).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/forUpdate/' + newDataStart_noTimeString + '/total' + jsUcfirst(newDataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            }

            console.log('add:ok');
          }
        }


      }
    }

    return null;

  });

exports.forUpdateToOverall = functions.https.onRequest((req, res) => {

  ref.child('reports/forUpdate').once('value').then(snapshot => {

    if (snapshot.exists()) {

      snapshot.forEach(element => {
        //given: date, lottype, total, status
        ref.child('reports/overAll').orderByKey().startAt(element.key).once('value').then(snap => {
          if (snap.exists()) {
            snap.forEach(elem => {

              var hold = 0;
              var reserved = 0;
              var sold = 0;
              if (element.val().totalHold) hold = Number(element.val().totalHold);
              if (element.val().totalReserved) reserved = Number(element.val().totalReserved);
              if (element.val().totalSold) sold = Number(element.val().totalSold);

              admin.database().ref('/reports/overAll/' + elem.key + '/overall/totalHold').transaction(val => val = Number(val) + hold).then(() => { });
              admin.database().ref('/reports/overAll/' + elem.key + '/overall/totalReserved').transaction(val => val = Number(val) + reserved).then(() => { });
              admin.database().ref('/reports/overAll/' + elem.key + '/overall/totalSold').transaction(val => val = Number(val) + sold).then(() => { });
              admin.database().ref('/reports/overAll/' + elem.key + '/overall/totalAvailable').transaction(val => val = Number(val) - hold - reserved - sold).then(() => { });

              element.forEach(zz => {

                // res.status(200).send('ok: ' + zz.key);

                if (zz.key == 'lotType') {
                  zz.forEach(xx => {

                    admin.database().ref('/reports/overAll/' + elem.key + '/lotType/' + xx.key + '/hold').transaction(val => val = val + (xx.val().hold = xx.val().hold ? xx.val().hold : 0)).then(() => { });
                    admin.database().ref('/reports/overAll/' + elem.key + '/lotType/' + xx.key + '/reserved').transaction(val => val = val + (xx.val().reserved = xx.val().reserved ? xx.val().reserved : 0)).then(() => { });
                    admin.database().ref('/reports/overAll/' + elem.key + '/lotType/' + xx.key + '/sold').transaction(val => val = val + (xx.val().sold = xx.val().sold ? xx.val().sold : 0)).then(() => { });
                    admin.database().ref('/reports/overAll/' + elem.key + '/lotType/' + xx.key + '/available').transaction(val => val = val - (xx.val().hold = xx.val().hold ? xx.val().hold : 0) - (xx.val().reserved = xx.val().reserved ? xx.val().reserved : 0) - (xx.val().sold = xx.val().sold ? xx.val().sold : 0)).then(() => { });
                  });
                }
              });

            });
          }
        });

      });

    }

    res.status(200).send('ok.forUpdateToOverall:' + snapshot.numChildren());

  });


});

const getWeekNumber = (d) => {
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var year = d.getUTCFullYear().toString().substring(2, 4);
  var week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  if (week < 10) { week = '0' + week };
  return year + 'w' + week;
};

const jsUcfirst = (xstring) => {
  return xstring.charAt(0).toUpperCase() + xstring.slice(1);
}

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

  updatePathsAtOnce['/reports/forUpdate'] = null;

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


exports.getDailyRunningTotal_LawnLots = functions.https.onRequest((req, res) => {
  // identofy type_status_invetoriable to query
  var toQuery = [
    //lawnlots
    {
      c0: 'lawnlots_hold_yes',
      c1: 'lawnlots',
      c2: 'hold'
    },
    {
      c0: 'lawnlots_sold_yes',
      c1: 'lawnlots',
      c2: 'sold'
    },
    {
      c0: 'lawnlots_reserved_yes',
      c1: 'lawnlots',
      c2: 'reserved'
    }
  ]


  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  toQuery.forEach(que => {
    // query to firebase
    ref.child('lots').orderByChild('type_status_inventoriable').equalTo(que.c0).once('value').then(snapshot => {
      if (snapshot.exists()) {
        var numOfChildren = snapshot.numChildren();
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = numOfChildren).then(() => { });

        if (que.c2 == "hold") totalHold = totalHold + numOfChildren;
        else if (que.c2 == "reserved") totalReserved = totalReserved + numOfChildren;
        else if (que.c2 == "sold") totalSold = totalSold + numOfChildren;
      }
      else {
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = 0).then(() => { });
      }

    });

    console.log(que.c1 + '-' + que.c2 + ":ok")

  })

  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalHold').transaction(qty => qty = totalHold).then(() => { });
  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalReserved').transaction(qty => qty = totalReserved).then(() => { });
  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalSold').transaction(qty => qty = totalSold).then(() => { });

  res.status(200).send('ok:getDailyRunningTotal');

});

exports.getDailyRunningTotal_WallNiche = functions.https.onRequest((req, res) => {
  // identofy type_status_invetoriable to query
  var toQuery = [
    //wallniche
    {
      c0: 'wallniche_hold_yes',
      c1: 'wallniche',
      c2: 'hold'
    },
    {
      c0: 'wallniche_sold_yes',
      c1: 'wallniche',
      c2: 'sold'
    },
    {
      c0: 'wallniche_reserved_yes',
      c1: 'wallniche',
      c2: 'reserved'
    }
  ]


  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  toQuery.forEach(que => {
    // query to firebase
    ref.child('lots').orderByChild('type_status_inventoriable').equalTo(que.c0).once('value').then(snapshot => {
      if (snapshot.exists()) {
        var numOfChildren = snapshot.numChildren();
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = numOfChildren).then(() => { });

        if (que.c2 == "hold") totalHold = totalHold + numOfChildren;
        else if (que.c2 == "reserved") totalReserved = totalReserved + numOfChildren;
        else if (que.c2 == "sold") totalSold = totalSold + numOfChildren;
      }
      else {
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = 0).then(() => { });
      }

    });

    console.log(que.c1 + '-' + que.c2 + ":ok")

  })

  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalHold').transaction(qty => qty = totalHold).then(() => { });
  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalReserved').transaction(qty => qty = totalReserved).then(() => { });
  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalSold').transaction(qty => qty = totalSold).then(() => { });

  res.status(200).send('ok:getDailyRunningTotal');

});

exports.getDailyRunningTotal_BoneChamber = functions.https.onRequest((req, res) => {
  // identofy type_status_invetoriable to query
  var toQuery = [
    //bonechamber
    {
      c0: 'bonechamber_hold_yes',
      c1: 'bonechamber',
      c2: 'hold'
    },
    {
      c0: 'bonechamber_sold_yes',
      c1: 'bonechamber',
      c2: 'sold'
    },
    {
      c0: 'bonechamber_reserved_yes',
      c1: 'bonechamber',
      c2: 'reserved'
    }
  ]


  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  toQuery.forEach(que => {
    // query to firebase
    ref.child('lots').orderByChild('type_status_inventoriable').equalTo(que.c0).once('value').then(snapshot => {
      if (snapshot.exists()) {
        var numOfChildren = snapshot.numChildren();
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = numOfChildren).then(() => { });

        if (que.c2 == "hold") totalHold = totalHold + numOfChildren;
        else if (que.c2 == "reserved") totalReserved = totalReserved + numOfChildren;
        else if (que.c2 == "sold") totalSold = totalSold + numOfChildren;
      }
      else {
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = 0).then(() => { });
      }

    });

    console.log(que.c1 + '-' + que.c2 + ":ok")

  })

  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalHold').transaction(qty => qty = totalHold).then(() => { });
  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalReserved').transaction(qty => qty = totalReserved).then(() => { });
  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalSold').transaction(qty => qty = totalSold).then(() => { });

  res.status(200).send('ok:getDailyRunningTotal');

});

exports.getDailyRunningTotal_Cinerarium = functions.https.onRequest((req, res) => {
  // identofy type_status_invetoriable to query
  var toQuery = [
    //cinerarium
    {
      c0: 'cinerarium_hold_yes',
      c1: 'cinerarium',
      c2: 'hold'
    },
    {
      c0: 'cinerarium_sold_yes',
      c1: 'cinerarium',
      c2: 'sold'
    },
    {
      c0: 'cinerarium_reserved_yes',
      c1: 'cinerarium',
      c2: 'reserved'
    }
  ]


  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  toQuery.forEach(que => {
    // query to firebase
    ref.child('lots').orderByChild('type_status_inventoriable').equalTo(que.c0).once('value').then(snapshot => {
      if (snapshot.exists()) {
        var numOfChildren = snapshot.numChildren();
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = numOfChildren).then(() => { });

        if (que.c2 == "hold") totalHold = totalHold + numOfChildren;
        else if (que.c2 == "reserved") totalReserved = totalReserved + numOfChildren;
        else if (que.c2 == "sold") totalSold = totalSold + numOfChildren;
      }
      else {
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = 0).then(() => { });
      }

    });

    console.log(que.c1 + '-' + que.c2 + ":ok")

  })

  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalHold').transaction(qty => qty = totalHold).then(() => { });
  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalReserved').transaction(qty => qty = totalReserved).then(() => { });
  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalSold').transaction(qty => qty = totalSold).then(() => { });

  res.status(200).send('ok:getDailyRunningTotal');

});

exports.getDailyRunningTotal_GardenLot = functions.https.onRequest((req, res) => {
  // identofy type_status_invetoriable to query
  var toQuery = [
    //gardenlots1
    {
      c0: 'gardenlots1_hold_yes',
      c1: 'gardenlots1',
      c2: 'hold'
    },
    {
      c0: 'gardenlots1_sold_yes',
      c1: 'gardenlots1',
      c2: 'sold'
    },
    {
      c0: 'gardenlots1_reserved_yes',
      c1: 'gardenlots1',
      c2: 'reserved'
    },
    // {
    //   c0: 'gardenlots1_available_yes',
    //   c1: 'gardenlots1',
    //   c2: 'available'
    // },
    // {
    //   c0: 'gardenlots1_notyetavailable_yes',
    //   c1: 'gardenlots1',
    //   c2: 'notyetavailable'
    // },
    //gardenlots2
    {
      c0: 'gardenlots2_hold_yes',
      c1: 'gardenlots2',
      c2: 'hold'
    },
    {
      c0: 'gardenlots2_sold_yes',
      c1: 'gardenlots2',
      c2: 'sold'
    },
    {
      c0: 'gardenlots2_reserved_yes',
      c1: 'gardenlots2',
      c2: 'reserved'
    },
    // {
    //   c0: 'gardenlots2_available_yes',
    //   c1: 'gardenlots2',
    //   c2: 'available'
    // },
    // {
    //   c0: 'gardenlots2_notyetavailable_yes',
    //   c1: 'gardenlots2',
    //   c2: 'notyetavailable'
    // },
    //gardenlots3
    {
      c0: 'gardenlots3_hold_yes',
      c1: 'gardenlots3',
      c2: 'hold'
    },
    {
      c0: 'gardenlots3_sold_yes',
      c1: 'gardenlots3',
      c2: 'sold'
    },
    {
      c0: 'gardenlots3_reserved_yes',
      c1: 'gardenlots3',
      c2: 'reserved'
    },
    // {
    //   c0: 'gardenlots3_available_yes',
    //   c1: 'gardenlots3',
    //   c2: 'available'
    // },
    // {
    //   c0: 'gardenlots3_notyetavailable_yes',
    //   c1: 'gardenlots3',
    //   c2: 'notyetavailable'
    // },
    //gardenlots4
    {
      c0: 'gardenlots4_hold_yes',
      c1: 'gardenlots4',
      c2: 'hold'
    },
    {
      c0: 'gardenlots4_sold_yes',
      c1: 'gardenlots4',
      c2: 'sold'
    },
    {
      c0: 'gardenlots4_reserved_yes',
      c1: 'gardenlots4',
      c2: 'reserved'
    },
    // {
    //   c0: 'gardenlots4_available_yes',
    //   c1: 'gardenlots4',
    //   c2: 'available'
    // },
    // {
    //   c0: 'gardenlots4_notyetavailable_yes',
    //   c1: 'gardenlots4',
    //   c2: 'notyetavailable'
    // },
    //gardenlots5
    {
      c0: 'gardenlots5_hold_yes',
      c1: 'gardenlots5',
      c2: 'hold'
    },
    {
      c0: 'gardenlots5_sold_yes',
      c1: 'gardenlots5',
      c2: 'sold'
    },
    {
      c0: 'gardenlots5_reserved_yes',
      c1: 'gardenlots5',
      c2: 'reserved'
    }
  ]


  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  toQuery.forEach(que => {
    // query to firebase
    ref.child('lots').orderByChild('type_status_inventoriable').equalTo(que.c0).once('value').then(snapshot => {
      if (snapshot.exists()) {
        var numOfChildren = snapshot.numChildren();
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = numOfChildren).then(() => { });

        if (que.c2 == "hold") totalHold = totalHold + numOfChildren;
        else if (que.c2 == "reserved") totalReserved = totalReserved + numOfChildren;
        else if (que.c2 == "sold") totalSold = totalSold + numOfChildren;
      }
      else {
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = 0).then(() => { });
      }

    });

    console.log(que.c1 + '-' + que.c2 + ":ok")

  })

  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalHold').transaction(qty => qty = totalHold).then(() => { });
  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalReserved').transaction(qty => qty = totalReserved).then(() => { });
  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalSold').transaction(qty => qty = totalSold).then(() => { });

  res.status(200).send('ok:getDailyRunningTotal');

});

exports.getDailyRunningTotal_FamilyLot = functions.https.onRequest((req, res) => {
  // identofy type_status_invetoriable to query
  var toQuery = [
    //familylots1
    {
      c0: 'familylots1_hold_yes',
      c1: 'familylots1',
      c2: 'hold'
    },
    {
      c0: 'familylots1_sold_yes',
      c1: 'familylots1',
      c2: 'sold'
    },
    {
      c0: 'familylots1_reserved_yes',
      c1: 'familylots1',
      c2: 'reserved'
    },
    // {
    //   c0: 'familylots1_available_yes',
    //   c1: 'familylots1',
    //   c2: 'available'
    // },
    // {
    //   c0: 'familylots1_notyetavailable_yes',
    //   c1: 'familylots1',
    //   c2: 'notyetavailable'
    // },
    //familylots2
    {
      c0: 'familylots2_hold_yes',
      c1: 'familylots2',
      c2: 'hold'
    },
    {
      c0: 'familylots2_sold_yes',
      c1: 'familylots2',
      c2: 'sold'
    },
    {
      c0: 'familylots2_reserved_yes',
      c1: 'familylots2',
      c2: 'reserved'
    },
    // {
    //   c0: 'familylots2_available_yes',
    //   c1: 'familylots2',
    //   c2: 'available'
    // },
    // {
    //   c0: 'familylots2_notyetavailable_yes',
    //   c1: 'familylots2',
    //   c2: 'notyetavailable'
    // },
    //familylots3
    {
      c0: 'familylots3_hold_yes',
      c1: 'familylots3',
      c2: 'hold'
    },
    {
      c0: 'familylots3_sold_yes',
      c1: 'familylots3',
      c2: 'sold'
    },
    {
      c0: 'familylots3_reserved_yes',
      c1: 'familylots3',
      c2: 'reserved'
    },
    // {
    //   c0: 'familylots3_available_yes',
    //   c1: 'familylots3',
    //   c2: 'available'
    // },
    // {
    //   c0: 'familylots3_notyetavailable_yes',
    //   c1: 'familylots3',
    //   c2: 'notyetavailable'
    // },
    //familylots4
    {
      c0: 'familylots4_hold_yes',
      c1: 'familylots4',
      c2: 'hold'
    },
    {
      c0: 'familylots4_sold_yes',
      c1: 'familylots4',
      c2: 'sold'
    },
    {
      c0: 'familylots4_reserved_yes',
      c1: 'familylots4',
      c2: 'reserved'
    },
    // {
    //   c0: 'familylots4_available_yes',
    //   c1: 'familylots4',
    //   c2: 'available'
    // },
    // {
    //   c0: 'familylots4_notyetavailable_yes',
    //   c1: 'familylots4',
    //   c2: 'notyetavailable'
    // },
    //familylots5
    {
      c0: 'familylots5_hold_yes',
      c1: 'familylots5',
      c2: 'hold'
    },
    {
      c0: 'familylots5_sold_yes',
      c1: 'familylots5',
      c2: 'sold'
    },
    {
      c0: 'familylots5_reserved_yes',
      c1: 'familylots5',
      c2: 'reserved'
    },
    // {
    //   c0: 'familylots5_available_yes',
    //   c1: 'familylots5',
    //   c2: 'available'
    // },
    // {
    //   c0: 'familylots5_notyetavailable_yes',
    //   c1: 'familylots5',
    //   c2: 'notyetavailable'
    // },
  ]


  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  toQuery.forEach(que => {
    // query to firebase
    ref.child('lots').orderByChild('type_status_inventoriable').equalTo(que.c0).once('value').then(snapshot => {
      if (snapshot.exists()) {
        var numOfChildren = snapshot.numChildren();
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = numOfChildren).then(() => { });

        if (que.c2 == "hold") totalHold = totalHold + numOfChildren;
        else if (que.c2 == "reserved") totalReserved = totalReserved + numOfChildren;
        else if (que.c2 == "sold") totalSold = totalSold + numOfChildren;
      }
      else {
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = 0).then(() => { });
      }

    });

    console.log(que.c1 + '-' + que.c2 + ":ok")

  })

  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalHold').transaction(qty => qty = totalHold).then(() => { });
  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalReserved').transaction(qty => qty = totalReserved).then(() => { });
  // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalSold').transaction(qty => qty = totalSold).then(() => { });

  res.status(200).send('ok:getDailyRunningTotal');

});

exports.getDailyRunningTotal_Totals = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);

  ref.child('/reports/overallTotalInventory/lotType').once('value').then(snapshot => {

    if (snapshot.exists()) {

      snapshot.forEach(element => {

        var open = element.val().open;
        var notyetavailable = element.val().notyetavailable;

        ref.child('/reports/overAll/' + serverDatePH_String + '/lotType/' + element.key).once('value').then(snap => {

          if (snap.exists()) {
            var hold = 0;
            var reserved = 0;
            var sold = 0;

            if (snap.val().hold) hold = snap.val().hold;
            if (snap.val().reserved) reserved = snap.val().reserved;
            if (snap.val().sold) sold = snap.val().sold;

            var available = open - (hold + reserved + sold);

            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + element.key + '/available').transaction(qty => qty = available).then(() => { });
            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + element.key + '/notyetavailable').transaction(qty => qty = notyetavailable).then(() => { });

            //overall total hold, reserved, sold
            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalHold').transaction(qty => qty = qty + hold).then(() => { });
            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalReserved').transaction(qty => qty = qty + reserved).then(() => { });
            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalSold').transaction(qty => qty = qty + sold).then(() => { });

            //overall total available and not yet available
            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalAvailable').transaction(qty => qty = qty + available).then(() => { });
            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalNotyetavailable').transaction(qty => qty = qty + notyetavailable).then(() => { });
          }
        });
      });
    }
  });
  res.status(200).send('ok');
});


// exports.getDailyRunningTotal = functions.https.onRequest((req, res) => {
//   // identofy type_status_invetoriable to query
//   var toQuery = [
//     //lawnlots
//     {
//       c0: 'lawnlots_hold_yes',
//       c1: 'lawnlots',
//       c2: 'hold'
//     },
//     {
//       c0: 'lawnlots_sold_yes',
//       c1: 'lawnlots',
//       c2: 'sold'
//     },
//     {
//       c0: 'lawnlots_reserved_yes',
//       c1: 'lawnlots',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'lawnlots_available_yes',
//     //   c1: 'lawnlots',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'lawnlots_notyetavailable_yes',
//     //   c1: 'lawnlots',
//     //   c2: 'notyetavailable'
//     // },
//     //wallniche
//     {
//       c0: 'wallniche_hold_yes',
//       c1: 'wallniche',
//       c2: 'hold'
//     },
//     {
//       c0: 'wallniche_sold_yes',
//       c1: 'wallniche',
//       c2: 'sold'
//     },
//     {
//       c0: 'wallniche_reserved_yes',
//       c1: 'wallniche',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'wallniche_available_yes',
//     //   c1: 'wallniche',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'wallniche_notyetavailable_yes',
//     //   c1: 'wallniche',
//     //   c2: 'notyetavailable'
//     // },
//     //cinerarium
//     {
//       c0: 'cinerarium_hold_yes',
//       c1: 'cinerarium',
//       c2: 'hold'
//     },
//     {
//       c0: 'cinerarium_sold_yes',
//       c1: 'cinerarium',
//       c2: 'sold'
//     },
//     {
//       c0: 'cinerarium_reserved_yes',
//       c1: 'cinerarium',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'cinerarium_available_yes',
//     //   c1: 'cinerarium',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'cinerarium_notyetavailable_yes',
//     //   c1: 'cinerarium',
//     //   c2: 'notyetavailable'
//     // },
//     //bonechamber
//     {
//       c0: 'bonechamber_hold_yes',
//       c1: 'bonechamber',
//       c2: 'hold'
//     },
//     {
//       c0: 'bonechamber_sold_yes',
//       c1: 'bonechamber',
//       c2: 'sold'
//     },
//     {
//       c0: 'bonechamber_reserved_yes',
//       c1: 'bonechamber',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'bonechamber_available_yes',
//     //   c1: 'bonechamber',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'bonechamber_notyetavailable_yes',
//     //   c1: 'bonechamber',
//     //   c2: 'notyetavailable'
//     // },
//     //familylots1
//     {
//       c0: 'familylots1_hold_yes',
//       c1: 'familylots1',
//       c2: 'hold'
//     },
//     {
//       c0: 'familylots1_sold_yes',
//       c1: 'familylots1',
//       c2: 'sold'
//     },
//     {
//       c0: 'familylots1_reserved_yes',
//       c1: 'familylots1',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'familylots1_available_yes',
//     //   c1: 'familylots1',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'familylots1_notyetavailable_yes',
//     //   c1: 'familylots1',
//     //   c2: 'notyetavailable'
//     // },
//     //familylots2
//     {
//       c0: 'familylots2_hold_yes',
//       c1: 'familylots2',
//       c2: 'hold'
//     },
//     {
//       c0: 'familylots2_sold_yes',
//       c1: 'familylots2',
//       c2: 'sold'
//     },
//     {
//       c0: 'familylots2_reserved_yes',
//       c1: 'familylots2',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'familylots2_available_yes',
//     //   c1: 'familylots2',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'familylots2_notyetavailable_yes',
//     //   c1: 'familylots2',
//     //   c2: 'notyetavailable'
//     // },
//     //familylots3
//     {
//       c0: 'familylots3_hold_yes',
//       c1: 'familylots3',
//       c2: 'hold'
//     },
//     {
//       c0: 'familylots3_sold_yes',
//       c1: 'familylots3',
//       c2: 'sold'
//     },
//     {
//       c0: 'familylots3_reserved_yes',
//       c1: 'familylots3',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'familylots3_available_yes',
//     //   c1: 'familylots3',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'familylots3_notyetavailable_yes',
//     //   c1: 'familylots3',
//     //   c2: 'notyetavailable'
//     // },
//     //familylots4
//     {
//       c0: 'familylots4_hold_yes',
//       c1: 'familylots4',
//       c2: 'hold'
//     },
//     {
//       c0: 'familylots4_sold_yes',
//       c1: 'familylots4',
//       c2: 'sold'
//     },
//     {
//       c0: 'familylots4_reserved_yes',
//       c1: 'familylots4',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'familylots4_available_yes',
//     //   c1: 'familylots4',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'familylots4_notyetavailable_yes',
//     //   c1: 'familylots4',
//     //   c2: 'notyetavailable'
//     // },
//     //familylots5
//     {
//       c0: 'familylots5_hold_yes',
//       c1: 'familylots5',
//       c2: 'hold'
//     },
//     {
//       c0: 'familylots5_sold_yes',
//       c1: 'familylots5',
//       c2: 'sold'
//     },
//     {
//       c0: 'familylots5_reserved_yes',
//       c1: 'familylots5',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'familylots5_available_yes',
//     //   c1: 'familylots5',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'familylots5_notyetavailable_yes',
//     //   c1: 'familylots5',
//     //   c2: 'notyetavailable'
//     // },
//     //gardenlots1
//     {
//       c0: 'gardenlots1_hold_yes',
//       c1: 'gardenlots1',
//       c2: 'hold'
//     },
//     {
//       c0: 'gardenlots1_sold_yes',
//       c1: 'gardenlots1',
//       c2: 'sold'
//     },
//     {
//       c0: 'gardenlots1_reserved_yes',
//       c1: 'gardenlots1',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'gardenlots1_available_yes',
//     //   c1: 'gardenlots1',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'gardenlots1_notyetavailable_yes',
//     //   c1: 'gardenlots1',
//     //   c2: 'notyetavailable'
//     // },
//     //gardenlots2
//     {
//       c0: 'gardenlots2_hold_yes',
//       c1: 'gardenlots2',
//       c2: 'hold'
//     },
//     {
//       c0: 'gardenlots2_sold_yes',
//       c1: 'gardenlots2',
//       c2: 'sold'
//     },
//     {
//       c0: 'gardenlots2_reserved_yes',
//       c1: 'gardenlots2',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'gardenlots2_available_yes',
//     //   c1: 'gardenlots2',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'gardenlots2_notyetavailable_yes',
//     //   c1: 'gardenlots2',
//     //   c2: 'notyetavailable'
//     // },
//     //gardenlots3
//     {
//       c0: 'gardenlots3_hold_yes',
//       c1: 'gardenlots3',
//       c2: 'hold'
//     },
//     {
//       c0: 'gardenlots3_sold_yes',
//       c1: 'gardenlots3',
//       c2: 'sold'
//     },
//     {
//       c0: 'gardenlots3_reserved_yes',
//       c1: 'gardenlots3',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'gardenlots3_available_yes',
//     //   c1: 'gardenlots3',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'gardenlots3_notyetavailable_yes',
//     //   c1: 'gardenlots3',
//     //   c2: 'notyetavailable'
//     // },
//     //gardenlots4
//     {
//       c0: 'gardenlots4_hold_yes',
//       c1: 'gardenlots4',
//       c2: 'hold'
//     },
//     {
//       c0: 'gardenlots4_sold_yes',
//       c1: 'gardenlots4',
//       c2: 'sold'
//     },
//     {
//       c0: 'gardenlots4_reserved_yes',
//       c1: 'gardenlots4',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'gardenlots4_available_yes',
//     //   c1: 'gardenlots4',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'gardenlots4_notyetavailable_yes',
//     //   c1: 'gardenlots4',
//     //   c2: 'notyetavailable'
//     // },
//     //gardenlots5
//     {
//       c0: 'gardenlots5_hold_yes',
//       c1: 'gardenlots5',
//       c2: 'hold'
//     },
//     {
//       c0: 'gardenlots5_sold_yes',
//       c1: 'gardenlots5',
//       c2: 'sold'
//     },
//     {
//       c0: 'gardenlots5_reserved_yes',
//       c1: 'gardenlots5',
//       c2: 'reserved'
//     },
//     // {
//     //   c0: 'gardenlots5_available_yes',
//     //   c1: 'gardenlots5',
//     //   c2: 'available'
//     // },
//     // {
//     //   c0: 'gardenlots5_notyetavailable_yes',
//     //   c1: 'gardenlots5',
//     //   c2: 'notyetavailable'
//     // }
//   ]


//   var serverDateTime = new Date();
//   var serverDateTimePH = new Date(serverDateTime);
//   serverDateTimePH.setHours(serverDateTime.getHours() + 8);
//   serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
//   var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
//   var totalHold = 0;
//   var totalReserved = 0;
//   var totalSold = 0;

//   toQuery.forEach(que => {
//     // query to firebase
//     ref.child('lots').orderByChild('type_status_inventoriable').equalTo(que.c0).once('value').then(snapshot => {
//       if (snapshot.exists()) {
//         var numOfChildren = snapshot.numChildren();
//         admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = numOfChildren).then(() => { });

//         if (que.c2 == "hold") totalHold = totalHold + numOfChildren;
//         else if (que.c2 == "reserved") totalReserved = totalReserved + numOfChildren;
//         else if (que.c2 == "sold") totalSold = totalSold + numOfChildren;
//       }
//       else {
//         admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + que.c1 + '/' + que.c2).transaction(qty => qty = 0).then(() => { });
//       }

//     });

//     console.log(que.c1 + '-' +  que.c2 + ":ok")

//   })

//   // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalHold').transaction(qty => qty = totalHold).then(() => { });
//   // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalReserved').transaction(qty => qty = totalReserved).then(() => { });
//   // admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalSold').transaction(qty => qty = totalSold).then(() => { });

//   res.status(200).send('ok:getDailyRunningTotal');

// });


exports.dataCatchupLotTypeStatusInventoriable = functions.https.onRequest((req, res) => {
  ref.child('lots').orderByChild('type_status_inventoriable').equalTo(null).limitToFirst(250).once('value').then(snapshot => {

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


exports.reportCatchupNov1Nov30 = functions.https.onRequest((req, res) => {
  //activity & comparative
  //daily,weekly,monthly,yearly

  //run in lots
  //get start (date)
  //extract for date,week,month,year
  //+1 in activity, capacity: 500

  ref.child('lots').orderByChild('reservationdetails/start').startAt('2017-11-01T00:00').endAt('2017-11-30T23:59').once('value').then(snapshot => {

    snapshot.forEach(element => {

      if (element.val().status != 'notyetavailable' && element.val().status != 'available') {
        if (element.val().inventoriable == 'yes') {
          if (element.val().reservationdetails.start) {

            var DataStart = new Date(element.val().reservationdetails.start);
            var DataStart_noTimeString = DataStart.getFullYear() + "-" + ("0" + (DataStart.getMonth() + 1)).slice(-2) + "-" + ("0" + DataStart.getDate()).slice(-2);
            var DataStart_noTimeDate = new Date(DataStart_noTimeString);
            var DataStart_Month = DataStart.getFullYear() + "-" + ("0" + (DataStart.getMonth() + 1)).slice(-2);
            var DataStart_Year = DataStart.getFullYear();
            var DataStart_Week = getWeekNumber(DataStart);

            var DataStatus = element.val().status;
            var Datatype = element.val().type;

            //daily
            admin.database().ref('/reports/activity/daily/' + DataStart_noTimeString + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/daily/' + DataStart_noTimeString + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //weekly
            admin.database().ref('/reports/activity/weekly/' + DataStart_Week + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/weekly/' + DataStart_Week + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //monthly
            admin.database().ref('/reports/activity/monthly/' + DataStart_Month + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/monthly/' + DataStart_Month + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //yearly
            admin.database().ref('/reports/activity/yearly/' + DataStart_Year + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/yearly/' + DataStart_Year + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //comparative
            admin.database().ref('/reports/comparative/' + Datatype + '/daily/' + DataStart_noTimeString + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + Datatype + '/weekly/' + DataStart_Week + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + Datatype + '/monthly/' + DataStart_Month + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + Datatype + '/yearly/' + DataStart_Year + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });


          }
        }
      }

    });


    res.status(200).send('ok.countLot.inventoriable:' + snapshot.numChildren());
  });


});

exports.reportCatchupDec1Dec31 = functions.https.onRequest((req, res) => {
  //activity & comparative
  //daily,weekly,monthly,yearly

  //run in lots
  //get start (date)
  //extract for date,week,month,year
  //+1 in activity, capacity: 500

  ref.child('lots').orderByChild('reservationdetails/start').startAt('2017-12-01T00:00').endAt('2017-12-31T23:59').once('value').then(snapshot => {

    snapshot.forEach(element => {

      if (element.val().status != 'notyetavailable' && element.val().status != 'available') {
        if (element.val().inventoriable == 'yes') {
          if (element.val().reservationdetails.start) {

            var DataStart = new Date(element.val().reservationdetails.start);
            var DataStart_noTimeString = DataStart.getFullYear() + "-" + ("0" + (DataStart.getMonth() + 1)).slice(-2) + "-" + ("0" + DataStart.getDate()).slice(-2);
            var DataStart_noTimeDate = new Date(DataStart_noTimeString);
            var DataStart_Month = DataStart.getFullYear() + "-" + ("0" + (DataStart.getMonth() + 1)).slice(-2);
            var DataStart_Year = DataStart.getFullYear();
            var DataStart_Week = getWeekNumber(DataStart);

            var DataStatus = element.val().status;
            var Datatype = element.val().type;

            //daily
            admin.database().ref('/reports/activity/daily/' + DataStart_noTimeString + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/daily/' + DataStart_noTimeString + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //weekly
            admin.database().ref('/reports/activity/weekly/' + DataStart_Week + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/weekly/' + DataStart_Week + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //monthly
            admin.database().ref('/reports/activity/monthly/' + DataStart_Month + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/monthly/' + DataStart_Month + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //yearly
            admin.database().ref('/reports/activity/yearly/' + DataStart_Year + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/yearly/' + DataStart_Year + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //comparative
            admin.database().ref('/reports/comparative/' + Datatype + '/daily/' + DataStart_noTimeString + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + Datatype + '/weekly/' + DataStart_Week + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + Datatype + '/monthly/' + DataStart_Month + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + Datatype + '/yearly/' + DataStart_Year + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });


          }
        }
      }

    });


    res.status(200).send('ok.countLot.inventoriable:' + snapshot.numChildren());
  });


});

exports.reportCatchupJan1Jan31 = functions.https.onRequest((req, res) => {
  //activity & comparative
  //daily,weekly,monthly,yearly

  //run in lots
  //get start (date)
  //extract for date,week,month,year
  //+1 in activity, capacity: 500

  ref.child('lots').orderByChild('reservationdetails/start').startAt('2018-01-01T00:00').endAt('2018-01-31T23:59').once('value').then(snapshot => {

    snapshot.forEach(element => {

      if (element.val().status != 'notyetavailable' && element.val().status != 'available') {
        if (element.val().inventoriable == 'yes') {
          if (element.val().reservationdetails.start) {

            var DataStart = new Date(element.val().reservationdetails.start);
            var DataStart_noTimeString = DataStart.getFullYear() + "-" + ("0" + (DataStart.getMonth() + 1)).slice(-2) + "-" + ("0" + DataStart.getDate()).slice(-2);
            var DataStart_noTimeDate = new Date(DataStart_noTimeString);
            var DataStart_Month = DataStart.getFullYear() + "-" + ("0" + (DataStart.getMonth() + 1)).slice(-2);
            var DataStart_Year = DataStart.getFullYear();
            var DataStart_Week = getWeekNumber(DataStart);

            var DataStatus = element.val().status;
            var Datatype = element.val().type;

            //daily
            admin.database().ref('/reports/activity/daily/' + DataStart_noTimeString + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/daily/' + DataStart_noTimeString + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //weekly
            admin.database().ref('/reports/activity/weekly/' + DataStart_Week + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/weekly/' + DataStart_Week + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //monthly
            admin.database().ref('/reports/activity/monthly/' + DataStart_Month + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/monthly/' + DataStart_Month + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //yearly
            admin.database().ref('/reports/activity/yearly/' + DataStart_Year + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/yearly/' + DataStart_Year + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //comparative
            admin.database().ref('/reports/comparative/' + Datatype + '/daily/' + DataStart_noTimeString + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + Datatype + '/weekly/' + DataStart_Week + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + Datatype + '/monthly/' + DataStart_Month + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + Datatype + '/yearly/' + DataStart_Year + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });


          }
        }
      }

    });


    res.status(200).send('ok.countLot.inventoriable:' + snapshot.numChildren());
  });


});

exports.reportCatchupFeb1Feb28 = functions.https.onRequest((req, res) => {
  //activity & comparative
  //daily,weekly,monthly,yearly

  //run in lots
  //get start (date)
  //extract for date,week,month,year
  //+1 in activity, capacity: 500

  ref.child('lots').orderByChild('reservationdetails/start').startAt('2018-02-01T00:00').endAt('2018-02-28T23:59').once('value').then(snapshot => {

    snapshot.forEach(element => {

      if (element.val().status != 'notyetavailable' && element.val().status != 'available') {
        if (element.val().inventoriable == 'yes') {
          if (element.val().reservationdetails.start) {

            var DataStart = new Date(element.val().reservationdetails.start);
            var DataStart_noTimeString = DataStart.getFullYear() + "-" + ("0" + (DataStart.getMonth() + 1)).slice(-2) + "-" + ("0" + DataStart.getDate()).slice(-2);
            var DataStart_noTimeDate = new Date(DataStart_noTimeString);
            var DataStart_Month = DataStart.getFullYear() + "-" + ("0" + (DataStart.getMonth() + 1)).slice(-2);
            var DataStart_Year = DataStart.getFullYear();
            var DataStart_Week = getWeekNumber(DataStart);

            var DataStatus = element.val().status;
            var Datatype = element.val().type;

            //daily
            admin.database().ref('/reports/activity/daily/' + DataStart_noTimeString + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/daily/' + DataStart_noTimeString + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //weekly
            admin.database().ref('/reports/activity/weekly/' + DataStart_Week + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/weekly/' + DataStart_Week + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //monthly
            admin.database().ref('/reports/activity/monthly/' + DataStart_Month + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/monthly/' + DataStart_Month + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //yearly
            admin.database().ref('/reports/activity/yearly/' + DataStart_Year + '/lotType/' + Datatype + '/' + DataStatus).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/activity/yearly/' + DataStart_Year + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });

            //comparative
            admin.database().ref('/reports/comparative/' + Datatype + '/daily/' + DataStart_noTimeString + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + Datatype + '/weekly/' + DataStart_Week + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + Datatype + '/monthly/' + DataStart_Month + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });
            admin.database().ref('/reports/comparative/' + Datatype + '/yearly/' + DataStart_Year + '/total' + jsUcfirst(DataStatus)).transaction(qty => qty = qty + 1).then(() => { });


          }
        }
      }

    });


    res.status(200).send('ok.countLot.inventoriable:' + snapshot.numChildren());
  });


});